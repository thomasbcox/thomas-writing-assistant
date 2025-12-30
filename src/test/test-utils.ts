/**
 * Test utilities for database operations
 * Uses Drizzle ORM for database access
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import BetterSqlite3 from "better-sqlite3";
import type { Database as BetterSqlite3Database } from "better-sqlite3";
import * as schema from "~/server/schema";
import type { DatabaseInstance } from "~/server/db";

/**
 * Create a test database instance
 * Uses an in-memory database for fast, isolated tests
 */
export function createTestDb(): DatabaseInstance {
  // Use in-memory database for tests (fastest and most isolated)
  const sqlite = new BetterSqlite3(":memory:");
  const db = drizzle(sqlite, { schema });
  return db;
}

/**
 * Create a test database with a file (for tests that need persistence)
 */
export function createTestDbFile(testDbPath: string = "./test.db") {
  const sqlite = new BetterSqlite3(testDbPath);
  const db = drizzle(sqlite, { schema });
  return { db, dbPath: testDbPath };
}

/**
 * Clean up test data from database
 */
export async function cleanupTestData(db: DatabaseInstance) {
  // Delete in reverse order of dependencies
  await db.delete(schema.link);
  await db.delete(schema.repurposedContent);
  await db.delete(schema.anchor);
  await db.delete(schema.capsule);
  await db.delete(schema.concept);
  await db.delete(schema.linkName);
  await db.delete(schema.mruConcept);
  
  // Recreate default link name pairs after cleanup
  const sqlite = (db as any).session?.client as BetterSqlite3Database | undefined;
  if (sqlite) {
    const defaultPairs = [
      { forward: "references", reverse: "referenced by", symmetric: false },
      { forward: "builds on", reverse: "built on by", symmetric: false },
      { forward: "related to", reverse: "related to", symmetric: true },
      { forward: "relates to", reverse: "related from", symmetric: false },
    ];

    for (const pair of defaultPairs) {
      const id = `ln_${pair.forward.replace(/\s+/g, "_")}`;
      sqlite
        .prepare(
          "INSERT OR IGNORE INTO LinkName (id, forwardName, reverseName, isSymmetric, isDefault, isDeleted, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          id,
          pair.forward,
          pair.reverse,
          pair.symmetric ? 1 : 0,
          1, // isDefault
          0, // isDeleted
          Date.now(),
        );
    }
  }
}

/**
 * Initialize test database schema
 * Run migrations or create tables manually
 * Note: This function is synchronous but marked async for API consistency
 */
export async function initTestDb(db: DatabaseInstance) {
  // For in-memory databases, we need to create the schema
  // We'll use raw SQL to create tables based on Drizzle schema

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
    
    CREATE TABLE IF NOT EXISTS "Capsule" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "promise" TEXT NOT NULL,
      "cta" TEXT NOT NULL,
      "offerMapping" TEXT,
      "createdAt" INTEGER NOT NULL,
      "updatedAt" INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS "Capsule_title_idx" ON "Capsule"("title");
    
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
  `;

  // Split by semicolon and execute each statement
  const statements = schemaSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Get the underlying SQLite database from Drizzle
  // Drizzle stores it at db.session.client for better-sqlite3
  const sqlite = (db as any).session?.client as BetterSqlite3Database | undefined;
  
  if (!sqlite) {
    throw new Error("Could not access SQLite database from Drizzle instance. Expected db.session.client to exist.");
  }

  for (const statement of statements) {
    try {
      sqlite.exec(statement);
    } catch (error) {
      throw new Error(`Failed to execute statement: ${statement.substring(0, 50)}... Error: ${error}`);
    }
  }
  
  // Verify tables were created
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
  if (tables.length === 0) {
    throw new Error("initTestDb: No tables were created after executing schema SQL");
  }
}

/**
 * Helper to run migrations on test database
 * This creates tables directly using raw SQL
 */
export async function migrateTestDb(db: DatabaseInstance) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-utils.ts:215',message:'migrateTestDb called',data:{hasDb:!!db,dbType:typeof db},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  await initTestDb(db);
  // #region agent log
  const sqlite = (db as any).session?.client;
  if (sqlite) {
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'test-utils.ts:222',message:'migrateTestDb completed',data:{tableCount:tables.length,tableNames:tables.map(t=>t.name)},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
  }
  // #endregion
}

/**
 * Close a test database connection
 */
export function closeTestDb(db: DatabaseInstance) {
  const sqlite = (db as any).session?.client as BetterSqlite3Database | undefined;
  if (sqlite && typeof sqlite.close === "function") {
    sqlite.close();
  }
}
