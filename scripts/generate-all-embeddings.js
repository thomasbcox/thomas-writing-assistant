#!/usr/bin/env node
/**
 * Script to generate embeddings for all concepts that don't have them
 * Usage: npm run embeddings:generate
 * 
 * This script uses the Electron database path (same as the app uses).
 */

import { join } from "path";
import { homedir } from "os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/server/schema.js";
import { generateMissingEmbeddingsWithContext } from "../src/server/services/embeddingOrchestrator.js";
import { getLLMClient } from "../src/server/services/llm/client.js";
import { getConfigLoader } from "../src/server/services/config.js";
import { getVectorIndex, initializeVectorIndex } from "../src/server/services/vectorIndex.js";
import { concept, conceptEmbedding } from "../src/server/schema.js";
import { eq, isNull } from "drizzle-orm";
import { config as dotenvConfig } from "dotenv";

// Load environment variables
dotenvConfig();

// Get the database path that Electron uses (same logic as electron/db.ts)
const dbFile = process.env.NODE_ENV === "production" ? "prod.db" : "dev.db";
const userDataPath = process.platform === "darwin"
  ? join(homedir(), "Library", "Application Support", "thomas-writing-assistant")
  : process.platform === "win32"
  ? join(process.env.APPDATA || "", "thomas-writing-assistant")
  : join(homedir(), ".config", "thomas-writing-assistant");
const dbPath = join(userDataPath, dbFile);

async function main() {
  console.log("🚀 Starting embedding generation for all concepts...\n");
  console.log(`📁 Using database: ${dbPath}\n`);

  let sqlite;
  try {
    // Initialize database connection using the same path as Electron
    sqlite = new Database(dbPath);
    const db = drizzle(sqlite, { schema });
    console.log("✅ Database connected");

    // Set the database as the current one for the services
    globalThis.__TEST_DB__ = db;

    // Initialize vector index (pass the db instance)
    console.log("📊 Initializing vector index...");
    const index = getVectorIndex();
    await index.initialize(db);
    console.log(`✅ Vector index initialized with ${index.size()} embeddings\n`);

    // Get status
    const allConcepts = await db.select().from(concept).where(eq(concept.status, "active"));
    const conceptsWithEmbeddings = await db
      .select({ conceptId: conceptEmbedding.conceptId })
      .from(conceptEmbedding)
      .innerJoin(concept, eq(concept.id, conceptEmbedding.conceptId))
      .where(eq(concept.status, "active"));

    const conceptsNeedingEmbeddings = allConcepts.length - conceptsWithEmbeddings.length;

    console.log(`📈 Status:`);
    console.log(`   Total concepts: ${allConcepts.length}`);
    console.log(`   Concepts with embeddings: ${conceptsWithEmbeddings.length}`);
    console.log(`   Concepts needing embeddings: ${conceptsNeedingEmbeddings}\n`);

    if (conceptsNeedingEmbeddings === 0) {
      console.log("✅ All concepts already have embeddings!");
      sqlite.close();
      return;
    }

    // Note: generateMissingEmbeddingsWithContext uses getLLMClient() and getConfigLoader() internally
    // We don't need to create a context here

    console.log(`🔄 Generating embeddings in batches of 10...`);
    console.log(`   Provider: ${llmClient.getProvider()}`);
    console.log(`   Model: ${llmClient.getModel()}\n`);

    // Generate embeddings in batches
    let totalGenerated = 0;
    let batchCount = 0;
    const batchSize = 10;

    while (true) {
      batchCount++;
      console.log(`📦 Batch ${batchCount}...`);

      const beforeCount = (await db.select().from(conceptEmbedding)).length;

      await generateMissingEmbeddingsWithContext(db, batchSize);

      const afterCount = (await db.select().from(conceptEmbedding)).length;
      const generatedThisBatch = afterCount - beforeCount;

      totalGenerated += generatedThisBatch;

      console.log(`   ✅ Generated ${generatedThisBatch} embeddings in this batch`);
      console.log(`   📊 Total generated so far: ${totalGenerated}/${conceptsNeedingEmbeddings}\n`);

      // Check if we're done
      if (generatedThisBatch === 0) {
        console.log("✅ All embeddings generated!");
        break;
      }

      // Safety limit to prevent infinite loops
      if (batchCount > 100) {
        console.log("⚠️  Reached batch limit (100). Stopping.");
        break;
      }
    }

    // Re-initialize vector index with all new embeddings
    console.log("🔄 Re-initializing vector index with all embeddings...");
    await index.initialize(db);
    console.log(`✅ Vector index now has ${index.size()} embeddings\n`);

    console.log("🎉 Embedding generation complete!");
    console.log(`   Total embeddings generated: ${totalGenerated}`);
    console.log(`   Final vector index size: ${index.size()}`);

    // Close database connection
    sqlite.close();

  } catch (error) {
    console.error("❌ Error generating embeddings:", error);
    if (sqlite) sqlite.close();
    process.exit(1);
  }
}

main();
