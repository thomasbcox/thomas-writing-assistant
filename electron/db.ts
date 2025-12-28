/**
 * Database module for Electron main process
 * 
 * This module provides database initialization and access without executing
 * any code at the top level. This allows it to be imported safely by tests
 * without triggering Electron app initialization.
 */

import { app } from "electron";
import { join, dirname } from "path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import * as schema from "../src/server/schema.js";

// Internal state - only initialized when initDb() is called
let sqlite: DatabaseType | null = null;
let db: BetterSQLite3Database<typeof schema> | null = null;

/**
 * Initialize the database connection
 * This should be called during app startup (e.g., in app.whenReady())
 * 
 * @returns The initialized Drizzle database instance
 */
export function initDb(): BetterSQLite3Database<typeof schema> {
  if (db) {
    // Already initialized
    return db;
  }

  // Use dev.db by default, or prod.db in production
  const dbFile = process.env.NODE_ENV === "production" ? "prod.db" : "dev.db";
  const dbPath = join(app.getPath("userData"), dbFile);

  // Ensure directory exists
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create SQLite connection
  sqlite = new Database(dbPath);
  
  // Create Drizzle instance
  db = drizzle(sqlite, { schema });

  console.log(`📊 Database initialized: ${dbPath}`);
  
  return db;
}

/**
 * Get the database instance
 * 
 * @throws Error if database has not been initialized
 * @returns The Drizzle database instance
 */
export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

/**
 * Close the database connection
 * Should be called during app shutdown
 */
export function closeDb(): void {
  if (sqlite) {
    try {
      sqlite.close();
      console.log("Database connection closed");
      sqlite = null;
      db = null;
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
}

