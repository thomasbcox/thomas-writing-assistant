/**
 * Database test utilities for creating and managing test databases
 * Uses real in-memory SQLite with Drizzle ORM for accurate testing
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import * as schema from "~/server/schema";
import type { DatabaseInstance } from "~/server/db";

/**
 * Create a test database instance using in-memory SQLite
 * Each call creates a fresh, isolated database
 * 
 * @returns A Drizzle database instance configured with the full schema
 * 
 * @example
 * ```typescript
 * const testDb = createTestDb();
 * await migrateTestDb(testDb);
 * // Use testDb for tests...
 * ```
 */
export function createTestDb(): DatabaseInstance {
  // Use in-memory database for fast, isolated tests
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  return db;
}

/**
 * Initialize the test database schema by creating all required tables
 * This uses the same schema SQL as production to ensure accuracy
 * 
 * @param db - The test database instance to migrate
 * @throws Error if schema initialization fails
 * 
 * @example
 * ```typescript
 * const testDb = createTestDb();
 * await migrateTestDb(testDb);
 * // Database is now ready for use
 * ```
 */
export async function migrateTestDb(db: DatabaseInstance): Promise<void> {
  // Get the underlying SQLite database from Drizzle
  const sqlite = (db as any).session?.client as DatabaseType | undefined;
  
  if (!sqlite) {
    throw new Error("Could not access SQLite database from Drizzle instance. Expected db.session.client to exist.");
  }

  // Use the same schema SQL as production (from electron/db.ts)
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS "Concept" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "identifier" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "content" TEXT NOT NULL,
      "creator" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "year" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" INTEGER NOT NULL,
      "updatedAt" INTEGER NOT NULL,
      "trashedAt" INTEGER
    );
    
    CREATE INDEX IF NOT EXISTS "Concept_status_idx" ON "Concept"("status");
    CREATE INDEX IF NOT EXISTS "Concept_identifier_idx" ON "Concept"("identifier");
    
    CREATE TABLE IF NOT EXISTS "LinkName" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "forwardName" TEXT NOT NULL UNIQUE,
      "reverseName" TEXT NOT NULL,
      "isSymmetric" INTEGER NOT NULL DEFAULT 0,
      "isDefault" INTEGER NOT NULL DEFAULT 0,
      "isDeleted" INTEGER NOT NULL DEFAULT 0,
      "createdAt" INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS "LinkName_forwardName_idx" ON "LinkName"("forwardName");
    CREATE INDEX IF NOT EXISTS "LinkName_reverseName_idx" ON "LinkName"("reverseName");
    
    CREATE TABLE IF NOT EXISTS "Link" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sourceId" TEXT NOT NULL,
      "targetId" TEXT NOT NULL,
      "linkNameId" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" INTEGER NOT NULL,
      FOREIGN KEY ("sourceId") REFERENCES "Concept"("id") ON DELETE CASCADE,
      FOREIGN KEY ("targetId") REFERENCES "Concept"("id") ON DELETE CASCADE,
      FOREIGN KEY ("linkNameId") REFERENCES "LinkName"("id") ON DELETE RESTRICT,
      UNIQUE("sourceId", "targetId")
    );
    
    CREATE INDEX IF NOT EXISTS "Link_sourceId_idx" ON "Link"("sourceId");
    CREATE INDEX IF NOT EXISTS "Link_targetId_idx" ON "Link"("targetId");
    CREATE INDEX IF NOT EXISTS "Link_linkNameId_idx" ON "Link"("linkNameId");
    
    CREATE TABLE IF NOT EXISTS "Offer" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" INTEGER NOT NULL DEFAULT (unixepoch()),
      "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    CREATE INDEX IF NOT EXISTS "Offer_name_idx" ON "Offer" ("name");
    
    CREATE TABLE IF NOT EXISTS "Capsule" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "promise" TEXT NOT NULL,
      "cta" TEXT NOT NULL,
      "offerId" TEXT REFERENCES "Offer"("id") ON DELETE SET NULL,
      "offerMapping" TEXT,
      "createdAt" INTEGER NOT NULL,
      "updatedAt" INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS "Capsule_title_idx" ON "Capsule"("title");
    CREATE INDEX IF NOT EXISTS "Capsule_offerId_idx" ON "Capsule"("offerId");
    
    CREATE TABLE IF NOT EXISTS "Anchor" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "capsuleId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "painPoints" TEXT,
      "solutionSteps" TEXT,
      "proof" TEXT,
      "createdAt" INTEGER NOT NULL,
      "updatedAt" INTEGER NOT NULL,
      FOREIGN KEY ("capsuleId") REFERENCES "Capsule"("id") ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS "Anchor_capsuleId_idx" ON "Anchor"("capsuleId");
    
    CREATE TABLE IF NOT EXISTS "RepurposedContent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "anchorId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "guidance" TEXT,
      "createdAt" INTEGER NOT NULL,
      FOREIGN KEY ("anchorId") REFERENCES "Anchor"("id") ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS "RepurposedContent_anchorId_idx" ON "RepurposedContent"("anchorId");
    CREATE INDEX IF NOT EXISTS "RepurposedContent_type_idx" ON "RepurposedContent"("type");
    
    CREATE TABLE IF NOT EXISTS "MRUConcept" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conceptId" TEXT NOT NULL UNIQUE,
      "lastUsed" INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS "MRUConcept_lastUsed_idx" ON "MRUConcept"("lastUsed");
    
    CREATE TABLE IF NOT EXISTS "ChatSession" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "conceptId" TEXT NOT NULL REFERENCES "Concept"("id") ON DELETE CASCADE,
      "title" TEXT,
      "createdAt" INTEGER NOT NULL DEFAULT (unixepoch()),
      "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    CREATE INDEX IF NOT EXISTS "ChatSession_conceptId_idx" ON "ChatSession" ("conceptId");
    CREATE INDEX IF NOT EXISTS "ChatSession_updatedAt_idx" ON "ChatSession" ("updatedAt");
    
    CREATE TABLE IF NOT EXISTS "ChatMessage" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "sessionId" TEXT NOT NULL REFERENCES "ChatSession"("id") ON DELETE CASCADE,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "suggestions" TEXT,
      "actions" TEXT,
      "createdAt" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_idx" ON "ChatMessage" ("sessionId");
    CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage" ("createdAt");
    
    CREATE TABLE IF NOT EXISTS "ConceptEmbedding" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "conceptId" TEXT NOT NULL UNIQUE REFERENCES "Concept"("id") ON DELETE CASCADE,
      "embedding" TEXT NOT NULL,
      "model" TEXT NOT NULL,
      "createdAt" INTEGER NOT NULL DEFAULT (unixepoch()),
      "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS "ConceptEmbedding_conceptId_unique" ON "ConceptEmbedding" ("conceptId");
    CREATE INDEX IF NOT EXISTS "ConceptEmbedding_model_idx" ON "ConceptEmbedding" ("model");
  `;

  // Split by semicolon and execute each statement
  const statements = schemaSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      sqlite.exec(statement);
    } catch (error) {
      throw new Error(`Failed to execute schema statement: ${statement.substring(0, 50)}... Error: ${error}`);
    }
  }
  
  // Verify tables were created
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
  const tableNames = tables.map(t => t.name).filter(name => !name.startsWith("_"));
  if (tableNames.length === 0) {
    throw new Error("Schema initialization failed: No tables were created");
  }
}

/**
 * Clean up all test data from the database
 * Deletes data in reverse dependency order to respect foreign key constraints
 * 
 * @param db - The test database instance to clean
 * 
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await cleanupTestData(testDb);
 * });
 * ```
 */
export async function cleanupTestData(db: DatabaseInstance): Promise<void> {
  // Delete in reverse order of dependencies to respect foreign key constraints
  await db.delete(schema.conceptEmbedding);
  await db.delete(schema.chatMessage);
  await db.delete(schema.chatSession);
  await db.delete(schema.repurposedContent);
  await db.delete(schema.anchor);
  await db.delete(schema.capsule);
  await db.delete(schema.offer);
  await db.delete(schema.link);
  await db.delete(schema.mruConcept);
  await db.delete(schema.concept);
  await db.delete(schema.linkName);
}

/**
 * Get the count of rows in a specific table
 * Useful for assertions in tests
 * 
 * @param db - The test database instance
 * @param tableName - The name of the table to count (e.g., "Concept", "Link")
 * @returns The number of rows in the table
 * 
 * @example
 * ```typescript
 * const count = await getTableCount(testDb, "Concept");
 * expect(count).toBe(5);
 * ```
 */
export async function getTableCount(
  db: DatabaseInstance,
  tableName: string,
): Promise<number> {
  const sqlite = (db as any).session?.client as DatabaseType | undefined;
  if (!sqlite) {
    throw new Error("Could not access SQLite database from Drizzle instance");
  }
  const result = sqlite.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as { count: number };
  return result.count;
}

/**
 * Close a test database connection
 * Useful for cleanup in tests that create multiple databases
 * 
 * @param db - The test database instance to close
 * 
 * @example
 * ```typescript
 * afterAll(() => {
 *   closeTestDb(testDb);
 * });
 * ```
 */
export function closeTestDb(db: DatabaseInstance): void {
  const sqlite = (db as any).session?.client as DatabaseType | undefined;
  if (sqlite && typeof sqlite.close === "function") {
    sqlite.close();
  }
}

