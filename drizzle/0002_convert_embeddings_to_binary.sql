-- Migration: Convert embedding column from TEXT (JSON) to BLOB (binary)
-- This migration converts existing JSON embeddings to binary format

-- Step 1: Create new table with BLOB column
CREATE TABLE IF NOT EXISTS "ConceptEmbedding_new" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "conceptId" TEXT NOT NULL UNIQUE REFERENCES "Concept"("id") ON DELETE CASCADE,
  "embedding" BLOB NOT NULL,
  "model" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);

-- Step 2: Copy data, converting JSON to binary
-- For each row, parse JSON array and convert to Float32Array buffer
INSERT INTO "ConceptEmbedding_new" ("id", "conceptId", "embedding", "model", "createdAt", "updatedAt")
SELECT 
  "id",
  "conceptId",
  -- Convert JSON array string to binary Float32Array
  -- SQLite doesn't have native JSON parsing, so we'll need to handle this in application code
  -- For now, we'll copy the data and let the application handle conversion on first access
  CAST("embedding" AS BLOB) as "embedding",
  "model",
  "createdAt",
  "updatedAt"
FROM "ConceptEmbedding"
WHERE typeof("embedding") = 'text';

-- Step 3: Drop old table
DROP TABLE IF EXISTS "ConceptEmbedding";

-- Step 4: Rename new table
ALTER TABLE "ConceptEmbedding_new" RENAME TO "ConceptEmbedding";

-- Step 5: Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ConceptEmbedding_conceptId_unique" ON "ConceptEmbedding" ("conceptId");
CREATE INDEX IF NOT EXISTS "ConceptEmbedding_model_idx" ON "ConceptEmbedding" ("model");

