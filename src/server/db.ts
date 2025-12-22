/**
 * Database connection using Drizzle ORM
 * Replaces Prisma for simpler testing and better TypeScript support
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { sql } from "drizzle-orm";
import { env } from "~/env";
import * as schema from "./schema";
import { existsSync, mkdirSync, statSync } from "fs";
import { dirname } from "path";
import { getDatabasePreference, getDatabasePath } from "./services/db-preference";

// Create a typed database instance - this ensures TypeScript knows about the relational query API
const createTypedDb = (sqlite: DatabaseType) => drizzle(sqlite, { schema });
type DatabaseInstance = ReturnType<typeof createTypedDb>;

const globalForDb = globalThis as unknown as {
  db: DatabaseInstance | undefined;
  sqlite: DatabaseType | undefined;
  dbPath: string | undefined;
};

/**
 * Get the database path based on preference, NODE_ENV, or DATABASE_URL
 */
function getDatabaseUrl(): string {
  // Priority 1: Explicit DATABASE_URL in .env (only if it's SQLite format)
  if (process.env.DATABASE_URL && env.DATABASE_URL.startsWith("file:")) {
    return env.DATABASE_URL;
  }

  // Priority 2: Database preference file (for runtime toggling)
  try {
    const preference = getDatabasePreference();
    const dbPath = getDatabasePath(preference);
    return `file:${dbPath}`;
  } catch (error) {
    console.warn("Failed to read database preference, falling back to NODE_ENV:", error);
  }

  // Priority 3: NODE_ENV-based selection (fallback)
  const dbFile = env.NODE_ENV === "production" ? "prod.db" : "dev.db";
  return `file:./${dbFile}`;
}

/**
 * Initialize database connection
 */
function initializeDatabase(): { sqlite: DatabaseType; db: DatabaseInstance; dbPath: string } {
  const databaseUrl = getDatabaseUrl();

  // Validate that DATABASE_URL is for SQLite, not PostgreSQL
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(
      `Invalid DATABASE_URL format. Expected SQLite format (file:./dev.db), got: ${databaseUrl}. ` +
      `Please update your .env file to use: DATABASE_URL="file:./dev.db"`
    );
  }

  const dbPath = databaseUrl.replace("file:", "");

  // Ensure directory exists for file-based databases (not in-memory)
  if (dbPath !== ":memory:" && !dbPath.startsWith(":memory:")) {
    const dir = dirname(dbPath);
    if (dir && dir !== "." && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Close existing connection if switching databases
  if (globalForDb.sqlite && globalForDb.dbPath && globalForDb.dbPath !== dbPath) {
    try {
      globalForDb.sqlite.close();
    } catch (error) {
      console.warn("Error closing previous database connection:", error);
    }
    globalForDb.sqlite = undefined;
    globalForDb.db = undefined;
  }

  // Create SQLite database connection
  const sqlite = globalForDb.sqlite ?? new Database(dbPath);

  // Check if database needs schema initialization
  try {
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    if (tables.length === 0) {
      console.log(`📦 Database ${dbPath} is empty. Initializing schema...`);
      console.warn(`⚠️  Please run: DATABASE_URL="file:${dbPath}" npm run db:push`);
      console.warn(`⚠️  Or the database will be initialized on first use (may cause errors)`);
    }
  } catch (error) {
    // Database might be brand new, that's okay
    console.log(`📦 New database file detected: ${dbPath}`);
  }

  // Create Drizzle instance with proper typing
  const db = globalForDb.db ?? createTypedDb(sqlite);

  // Store in global for reuse (in development)
  if (env.NODE_ENV !== "production") {
    globalForDb.sqlite = sqlite;
    globalForDb.db = db;
    globalForDb.dbPath = dbPath;
  }

  // Log which database is being used (helpful for debugging)
  if (env.NODE_ENV !== "test") {
    console.log(`📊 Using database: ${dbPath} (NODE_ENV: ${env.NODE_ENV})`);
  }

  return { sqlite, db, dbPath };
}

// Initialize database connection
const { db: initialDb, dbPath: initialDbPath } = initializeDatabase();

// Export the database instance
export const db = initialDb;

/**
 * Reconnect to database (useful for runtime switching)
 * This closes the old connection and creates a new one with the updated preference.
 * Note: The module-level export `db` will point to the new connection.
 */
export async function reconnectDatabase(): Promise<void> {
  try {
    // Close existing connection
    if (globalForDb.sqlite) {
      try {
        globalForDb.sqlite.close();
      } catch (error) {
        console.warn("Error closing previous database connection:", error);
      }
    }

    // Clear global state
    globalForDb.sqlite = undefined;
    globalForDb.db = undefined;
    globalForDb.dbPath = undefined;

    // Reinitialize with new preference
    const { sqlite: newSqlite, db: newDb, dbPath: newDbPath } = initializeDatabase();

    // Update global state
    if (env.NODE_ENV !== "production") {
      globalForDb.sqlite = newSqlite;
      globalForDb.db = newDb;
      globalForDb.dbPath = newDbPath;
    }

    // Update the module-level export by replacing it in the module cache
    // This is a workaround since we can't directly reassign the export
    (module as any).exports.db = newDb;

    console.log(`✅ Database reconnected successfully. Now using: ${newDbPath}`);
  } catch (error) {
    console.error("❌ Failed to reconnect database:", error);
    throw error;
  }
}

// Export schema for use in queries
export { schema };
