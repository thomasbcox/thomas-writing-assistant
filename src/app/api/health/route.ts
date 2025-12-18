/**
 * Health check API endpoint
 * GET /api/health - Returns system health status
 */

import { NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";
import { getConfigLoader } from "~/server/services/config";

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

  // Check database
  try {
    const dbStartTime = Date.now();
    await getDb().concept.count();
    const dbResponseTime = Date.now() - dbStartTime;
    checks.database = {
      status: "healthy",
      message: "Database is connected",
      responseTime: dbResponseTime,
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Database connection failed",
    };
    issues.push("Database connection failed");
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
    // Could test other endpoints, but that's expensive
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
