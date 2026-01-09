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
  
  // Check if database needs schema initialization or migration
  try {
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const tableNames = tables.map(t => t.name).filter(name => !name.startsWith("_"));
    
    // Required tables for the new features
    const requiredTables = ["LLMCache", "ContextSession", "ConceptSummary"];
    const missingTables = requiredTables.filter(name => !tableNames.includes(name));
    
    if (tableNames.length === 0) {
      console.log(`📦 Database ${dbPath} is empty. Initializing schema...`);
      initializeSchema(sqlite);
      console.log(`✅ Schema initialized successfully`);
    } else if (missingTables.length > 0) {
      console.log(`📦 Database ${dbPath} is missing tables: ${missingTables.join(", ")}. Adding missing tables...`);
      // Run schema initialization to add missing tables (CREATE TABLE IF NOT EXISTS is safe)
      initializeSchema(sqlite);
      console.log(`✅ Missing tables added successfully`);
    } else {
      console.log(`📊 Database ${dbPath} has ${tableNames.length} table(s): ${tableNames.join(", ")}`);
    }
  } catch (error) {
    console.warn(`⚠️  Could not check database tables: ${error}`);
    // Try to initialize schema anyway
    try {
      initializeSchema(sqlite);
      console.log(`✅ Schema initialized successfully`);
    } catch (initError) {
      console.error(`❌ Failed to initialize schema: ${initError}`);
    }
  }
  
  // Create Drizzle instance
  db = drizzle(sqlite, { schema });

  // Expose database globally so src/server/db.ts can access it
  (globalThis as any).__ELECTRON_DB__ = db;

  console.log(`📊 Database initialized: ${dbPath}`);
  
  return db;
}

/**
 * Initialize database schema by creating all required tables
 */
function initializeSchema(sqlite: DatabaseType): void {
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
      "embedding" BLOB NOT NULL,
      "model" TEXT NOT NULL,
      "createdAt" INTEGER NOT NULL DEFAULT (unixepoch()),
      "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS "ConceptEmbedding_conceptId_unique" ON "ConceptEmbedding" ("conceptId");
    CREATE INDEX IF NOT EXISTS "ConceptEmbedding_model_idx" ON "ConceptEmbedding" ("model");
    
    CREATE TABLE IF NOT EXISTS "LLMCache" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "queryEmbedding" BLOB NOT NULL,
      "queryText" TEXT NOT NULL,
      "response" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "model" TEXT NOT NULL,
      "createdAt" INTEGER NOT NULL DEFAULT (unixepoch()),
      "lastUsedAt" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    CREATE INDEX IF NOT EXISTS "LLMCache_provider_model_idx" ON "LLMCache" ("provider", "model");
    CREATE INDEX IF NOT EXISTS "LLMCache_lastUsedAt_idx" ON "LLMCache" ("lastUsedAt");
    
    CREATE TABLE IF NOT EXISTS "ContextSession" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "sessionKey" TEXT NOT NULL UNIQUE,
      "provider" TEXT NOT NULL,
      "model" TEXT NOT NULL,
      "contextMessages" TEXT NOT NULL,
      "conceptIds" TEXT,
      "expiresAt" INTEGER NOT NULL,
      "createdAt" INTEGER NOT NULL DEFAULT (unixepoch()),
      "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS "ContextSession_sessionKey_unique" ON "ContextSession" ("sessionKey");
    CREATE INDEX IF NOT EXISTS "ContextSession_expiresAt_idx" ON "ContextSession" ("expiresAt");
    
    CREATE TABLE IF NOT EXISTS "ConceptSummary" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "conceptId" TEXT NOT NULL UNIQUE REFERENCES "Concept"("id") ON DELETE CASCADE,
      "summary" TEXT NOT NULL,
      "keyPoints" TEXT,
      "contentHash" TEXT NOT NULL,
      "createdAt" INTEGER NOT NULL DEFAULT (unixepoch()),
      "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS "ConceptSummary_conceptId_unique" ON "ConceptSummary" ("conceptId");
    CREATE INDEX IF NOT EXISTS "ConceptSummary_contentHash_idx" ON "ConceptSummary" ("contentHash");
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

