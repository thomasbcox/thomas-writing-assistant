/**
 * Database connection using Drizzle ORM
 * Replaces Prisma for simpler testing and better TypeScript support
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "~/env";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle> | undefined;
  sqlite: Database | undefined;
};

// Extract the file path from DATABASE_URL (format: "file:./dev.db")
// Validate that DATABASE_URL is for SQLite, not PostgreSQL
if (!env.DATABASE_URL.startsWith("file:")) {
  throw new Error(
    `Invalid DATABASE_URL format. Expected SQLite format (file:./dev.db), got: ${env.DATABASE_URL}. ` +
    `Please update your .env file to use: DATABASE_URL="file:./dev.db"`
  );
}

const dbPath = env.DATABASE_URL.replace("file:", "");

// Ensure directory exists for file-based databases (not in-memory)
if (dbPath !== ":memory:" && !dbPath.startsWith(":memory:")) {
  const dir = dirname(dbPath);
  if (dir && dir !== "." && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Create SQLite database connection (reuse in development)
// better-sqlite3 will create the file if it doesn't exist
const sqlite =
  globalForDb.sqlite ?? new Database(dbPath);

if (env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

// Create Drizzle instance
export const db =
  globalForDb.db ?? drizzle(sqlite, { schema });

if (env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

// Export schema for use in queries
export { schema };
