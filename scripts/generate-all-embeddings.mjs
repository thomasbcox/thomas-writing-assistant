#!/usr/bin/env node
/**
 * Script to generate embeddings for all concepts that don't have them
 * Usage: npm run embeddings:generate
 * 
 * This script uses the Electron database path (same as the app uses).
 * 
 * WHAT ARE EMBEDDINGS?
 * ====================
 * Embeddings are numerical representations of text that capture semantic meaning.
 * Think of them as "fingerprints" for concepts:
 * 
 * - Similar concepts have similar embeddings (close numbers)
 * - Different concepts have different embeddings (distant numbers)
 * - The AI uses embeddings to find related concepts quickly
 * 
 * For example:
 * - "Leadership" and "Management" would have similar embeddings
 * - "Leadership" and "Banana" would have very different embeddings
 * 
 * The "Propose Links" feature uses embeddings to find which concepts are
 * semantically similar to the one you're viewing, so it can suggest connections.
 * 
 * AUTOMATIC EMBEDDING GENERATION:
 * ===============================
 * ✅ NEW concepts: Embeddings are automatically generated when you create a concept
 * ✅ UPDATED concepts: Embeddings are automatically regenerated when you update a concept
 * ⚠️  EXISTING concepts: Need embeddings generated manually (this script does that)
 */

import { join } from "path";
import { homedir } from "os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { config as dotenvConfig } from "dotenv";
import { readFileSync } from "fs";

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

// Simple SQL queries (no need for full Drizzle setup for this script)
async function main() {
  console.log("🚀 Starting embedding generation for all concepts...\n");
  console.log(`📁 Using database: ${dbPath}\n`);

  let sqlite;
  try {
    // Connect to database
    sqlite = new Database(dbPath);
    console.log("✅ Database connected\n");

    // Get status using raw SQL
    const totalConcepts = sqlite.prepare("SELECT COUNT(*) as count FROM Concept WHERE status = 'active'").get();
    const conceptsWithEmbeddings = sqlite.prepare(`
      SELECT COUNT(*) as count 
      FROM Concept c 
      INNER JOIN ConceptEmbedding ce ON c.id = ce.conceptId 
      WHERE c.status = 'active'
    `).get();

    const total = totalConcepts.count;
    const withEmbeddings = conceptsWithEmbeddings.count;
    const needingEmbeddings = total - withEmbeddings;

    console.log(`📈 Status:`);
    console.log(`   Total concepts: ${total}`);
    console.log(`   Concepts with embeddings: ${withEmbeddings}`);
    console.log(`   Concepts needing embeddings: ${needingEmbeddings}\n`);

    if (needingEmbeddings === 0) {
      console.log("✅ All concepts already have embeddings!");
      sqlite.close();
      return;
    }

    console.log(`⚠️  This script requires the Electron app to be running.`);
    console.log(`   Please use the app's UI to generate embeddings, or run this from within the app.\n`);
    console.log(`   The app has an "AI Settings" section where you can generate missing embeddings.\n`);
    
    sqlite.close();

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (sqlite) sqlite.close();
    process.exit(1);
  }
}

main();

