#!/usr/bin/env tsx
/**
 * Script to delete all concepts from the database
 * This will also delete all associated links due to cascade delete
 * Usage: npx tsx scripts/delete-all-concepts.ts
 * 
 * Updated for Drizzle ORM
 */

import { db } from "../src/server/db";
import { concept, link, mruConcept } from "../src/server/schema";
import { eq } from "drizzle-orm";

async function deleteAllConcepts() {
  try {
    console.log("Starting deletion of all concepts...");

    // First, get counts using Drizzle
    const allConcepts = await db.select().from(concept);
    const allLinks = await db.select().from(link);
    const conceptCount = allConcepts.length;
    const linkCount = allLinks.length;

    console.log(`Found ${conceptCount} concepts and ${linkCount} links to delete.`);

    if (conceptCount === 0) {
      console.log("No concepts to delete. Database is already clean.");
      return;
    }

    // Delete all links first (they will be cascade deleted anyway, but this is cleaner)
    const deletedLinks = await db.delete(link);
    console.log(`Deleted ${linkCount} links.`);

    // Delete all concepts (this will cascade delete any remaining links)
    const deletedConcepts = await db.delete(concept);
    console.log(`Deleted ${conceptCount} concepts.`);

    // Also clean up MRUConcept table (most recently used concepts)
    const allMRU = await db.select().from(mruConcept);
    if (allMRU.length > 0) {
      await db.delete(mruConcept);
      console.log(`Deleted ${allMRU.length} MRU concept records.`);
    }

    console.log("✅ Successfully deleted all concepts and associated links!");
  } catch (error) {
    console.error("❌ Error deleting concepts:", error);
    process.exit(1);
  }
}

deleteAllConcepts();

