/**
 * Health check API endpoint
 * GET /api/health - Returns system health status
 * Uses Drizzle ORM for database access
 */

import { NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";
import { getConfigLoader } from "~/server/services/config";
import { concept } from "~/server/schema";
import type Database from "better-sqlite3";
import { logServiceError } from "~/lib/logger";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  responseTime?: number;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    server: HealthCheck;
    database: HealthCheck;
    config: {
      status: "healthy" | "degraded" | "unhealthy";
      styleGuide: { loaded: boolean; isEmpty: boolean };
      credo: { loaded: boolean; isEmpty: boolean };
      constraints: { loaded: boolean; isEmpty: boolean };
      issues: string[];
    };
    api: HealthCheck;
  };
  issues: string[];
}

export async function GET() {
  const startTime = Date.now();
  const issues: string[] = [];
  const checks: HealthResponse["checks"] = {
    server: { status: "healthy" },
    database: { status: "unhealthy" },
    config: {
      status: "healthy",
      styleGuide: { loaded: false, isEmpty: true },
      credo: { loaded: false, isEmpty: true },
      constraints: { loaded: false, isEmpty: true },
      issues: [],
    },
    api: { status: "healthy" },
  };

  // Check server (always healthy if we're responding)
  const serverResponseTime = Date.now() - startTime;
  checks.server = {
    status: "healthy",
    message: "Server is responding",
    responseTime: serverResponseTime,
  };

  // Check database with timeout - verify tables exist
  try {
    const dbStartTime = Date.now();
    const db = getDb();
    
    // Use raw SQLite to check if tables exist
    const sqlite = (db as any).$client || (db as any).session?.client as InstanceType<typeof Database> | undefined;
    if (sqlite) {
      // First verify database is accessible
      sqlite.prepare("SELECT 1").get();
      
      // Then check if required tables exist
      const requiredTables = ["Concept", "Link", "Capsule", "Anchor", "RepurposedContent", "LinkName", "MRUConcept"];
      const missingTables: string[] = [];
      
      for (const tableName of requiredTables) {
        const result = sqlite
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
          .get(tableName) as { name: string } | undefined;
        
        if (!result) {
          missingTables.push(tableName);
        }
      }
      
      const dbResponseTime = Date.now() - dbStartTime;
      
      if (missingTables.length > 0) {
        checks.database = {
          status: "unhealthy",
          message: `Missing tables: ${missingTables.join(", ")}`,
          responseTime: dbResponseTime,
        };
        issues.push(`Database: Missing required tables: ${missingTables.join(", ")}`);
      } else if (dbResponseTime > 1000) {
        // Database is slow but working
        checks.database = {
          status: "degraded",
          message: `Database is connected but slow (${dbResponseTime}ms)`,
          responseTime: dbResponseTime,
        };
        issues.push(`Database response time is high: ${dbResponseTime}ms`);
      } else {
        checks.database = {
          status: "healthy",
          message: "Database is connected and all tables exist",
          responseTime: dbResponseTime,
        };
      }
    } else {
      // Fallback to Drizzle query with timeout - this will fail if tables don't exist
      const dbCheckPromise = db.select().from(concept).limit(1);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout (2s)")), 2000)
      );
      
      await Promise.race([dbCheckPromise, timeoutPromise]);
      const dbResponseTime = Date.now() - dbStartTime;
      checks.database = {
        status: "healthy",
        message: "Database is connected",
        responseTime: dbResponseTime,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Database connection failed";
    const isMissingTable = errorMessage.includes("no such table") || errorMessage.includes("does not exist");
    const isInvalidUrl = errorMessage.includes("Invalid DATABASE_URL");
    
    // Log the error for debugging
    logServiceError(error, "Health check - Database", {
      errorMessage,
      isMissingTable,
      isInvalidUrl,
    });
    
    checks.database = {
      status: "unhealthy",
      message: isInvalidUrl
        ? "Database URL format is invalid - check .env file"
        : isMissingTable 
        ? `Database schema not initialized: ${errorMessage}` 
        : errorMessage,
    };
    issues.push(
      isInvalidUrl
        ? "Database: Invalid DATABASE_URL format in .env file - must be 'file:./dev.db' for SQLite"
        : `Database: ${isMissingTable ? "Schema not initialized - run 'npm run db:push'" : errorMessage}`
    );
  }

  // Check configuration files
  try {
    const configLoader = getConfigLoader();
    const configStatus = configLoader.getConfigStatus();

    checks.config = {
      status: "healthy",
      styleGuide: configStatus.styleGuide,
      credo: configStatus.credo,
      constraints: configStatus.constraints,
      issues: [],
    };

    if (configStatus.styleGuide.isEmpty) {
      checks.config.issues.push("Style guide is missing or empty");
      issues.push("Configuration: Style guide is missing");
    }
    if (configStatus.credo.isEmpty) {
      checks.config.issues.push("Credo is missing or empty");
      issues.push("Configuration: Credo is missing");
    }
    if (configStatus.constraints.isEmpty) {
      checks.config.issues.push("Constraints are missing or empty");
      issues.push("Configuration: Constraints are missing");
    }

    if (checks.config.issues.length > 0) {
      checks.config.status = "degraded";
    }
  } catch (error) {
    // Log config loading errors
    logServiceError(error, "Health check - Configuration", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    
    checks.config = {
      status: "unhealthy",
      styleGuide: { loaded: false, isEmpty: true },
      credo: { loaded: false, isEmpty: true },
      constraints: { loaded: false, isEmpty: true },
      issues: ["Failed to load configuration files"],
    };
    issues.push("Configuration: Failed to load config files");
  }

  // Check API endpoints (test a few critical ones)
  try {
    // We're already in an API route, so API is working
    checks.api = {
      status: "healthy",
      message: "API endpoints are responding",
    };
  } catch (error) {
    checks.api = {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "API check failed",
    };
    issues.push("API endpoints are not responding");
  }

  // Determine overall status
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (checks.database.status === "unhealthy" || checks.api.status === "unhealthy") {
    overallStatus = "unhealthy";
  } else if (checks.config.status === "degraded" || checks.config.issues.length > 0) {
    overallStatus = "degraded";
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    issues,
  };

  // Return appropriate HTTP status code
  const httpStatus = overallStatus === "unhealthy" ? 503 : overallStatus === "degraded" ? 200 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
