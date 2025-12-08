import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { createCallerFactory } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";

/**
 * Create a test database instance
 * Uses an in-memory database for fast, isolated tests
 */
export function createTestDb() {
  // Use in-memory database for tests (fastest and most isolated)
  const adapter = new PrismaBetterSqlite3({ url: ":memory:" });
  const db = new PrismaClient({
    adapter,
    log: [], // Disable logging in tests
  });

  return db;
}

/**
 * Create a test database with a file (for tests that need persistence)
 */
export function createTestDbFile(testDbPath: string = "./test.db") {
  // Clean up any existing test database
  if (existsSync(testDbPath)) {
    unlinkSync(testDbPath);
  }

  const adapter = new PrismaBetterSqlite3({ url: testDbPath });
  const db = new PrismaClient({
    adapter,
    log: [],
  });

  return { db, dbPath: testDbPath };
}

/**
 * Create a test tRPC caller with a test database
 */
export function createTestCaller(testDb: PrismaClient) {
  // Create context with test database
  const createContext = async () => {
    return {
      db: testDb,
      headers: new Headers(),
    };
  };

  const createCaller = createCallerFactory(appRouter);
  return createCaller(createContext);
}

/**
 * Clean up test data from database
 */
export async function cleanupTestData(db: PrismaClient) {
  // Delete in reverse order of dependencies
  await db.link.deleteMany({});
  await db.repurposedContent.deleteMany({});
  await db.anchor.deleteMany({});
  await db.capsule.deleteMany({});
  await db.concept.deleteMany({});
  await db.linkName.deleteMany({});
  await db.mRUConcept.deleteMany({});
}

/**
 * Initialize test database schema
 * Run migrations or create tables manually
 */
export async function initTestDb(db: PrismaClient) {
  // For in-memory databases, we need to create the schema
  // We'll use raw SQL to create tables based on Prisma schema
  
  // Note: In a real scenario, you might want to run migrations
  // For now, we'll let Prisma handle it through the adapter
  
  // The adapter should handle schema creation automatically
  // But we can verify by trying a simple query
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    // If schema doesn't exist, we need to create it
    // For SQLite, we can execute the migration SQL
    throw new Error(
      "Test database schema not initialized. Consider running migrations or creating schema manually."
    );
  }
}

/**
 * Helper to run migrations on test database
 * This would typically use Prisma migrate programmatically
 */
export async function migrateTestDb(db: PrismaClient) {
  // For in-memory databases, we can't use file-based migrations
  // Instead, we'll create tables directly using raw SQL
  // This is based on the Prisma schema
  
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS "Concept" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "identifier" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "content" TEXT NOT NULL,
      "creator" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "year" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "trashedAt" DATETIME
    );
    
    CREATE INDEX IF NOT EXISTS "Concept_status_idx" ON "Concept"("status");
    CREATE INDEX IF NOT EXISTS "Concept_identifier_idx" ON "Concept"("identifier");
    
    CREATE TABLE IF NOT EXISTS "Link" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sourceId" TEXT NOT NULL,
      "targetId" TEXT NOT NULL,
      "forwardName" TEXT NOT NULL,
      "reverseName" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("sourceId") REFERENCES "Concept"("id") ON DELETE CASCADE,
      FOREIGN KEY ("targetId") REFERENCES "Concept"("id") ON DELETE CASCADE,
      UNIQUE("sourceId", "targetId")
    );
    
    CREATE INDEX IF NOT EXISTS "Link_sourceId_idx" ON "Link"("sourceId");
    CREATE INDEX IF NOT EXISTS "Link_targetId_idx" ON "Link"("targetId");
    
    CREATE TABLE IF NOT EXISTS "LinkName" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "isDefault" INTEGER NOT NULL DEFAULT 0,
      "isDeleted" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS "LinkName_name_idx" ON "LinkName"("name");
    
    CREATE TABLE IF NOT EXISTS "Capsule" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "promise" TEXT NOT NULL,
      "cta" TEXT NOT NULL,
      "offerMapping" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("capsuleId") REFERENCES "Capsule"("id") ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS "Anchor_capsuleId_idx" ON "Anchor"("capsuleId");
    
    CREATE TABLE IF NOT EXISTS "RepurposedContent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "anchorId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("anchorId") REFERENCES "Anchor"("id") ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS "RepurposedContent_anchorId_idx" ON "RepurposedContent"("anchorId");
    CREATE INDEX IF NOT EXISTS "RepurposedContent_type_idx" ON "RepurposedContent"("type");
    
    CREATE TABLE IF NOT EXISTS "MRUConcept" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conceptId" TEXT NOT NULL UNIQUE,
      "lastUsed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS "MRUConcept_lastUsed_idx" ON "MRUConcept"("lastUsed");
  `;

  // Split by semicolon and execute each statement
  const statements = schemaSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.$executeRawUnsafe(statement);
  }
}

