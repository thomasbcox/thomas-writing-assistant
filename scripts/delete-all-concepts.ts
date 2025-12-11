#!/usr/bin/env tsx
/**
 * Script to delete all concepts from the database
 * This will also delete all associated links due to cascade delete
 * Usage: npx tsx scripts/delete-all-concepts.ts
 */

import { db } from "../src/server/db";

async function deleteAllConcepts() {
  try {
    console.log("Starting deletion of all concepts...");

    // First, get counts
    const conceptCount = await db.concept.count();
    const linkCount = await db.link.count();

    console.log(`Found ${conceptCount} concepts and ${linkCount} links to delete.`);

    if (conceptCount === 0) {
      console.log("No concepts to delete. Database is already clean.");
      return;
    }

    // Delete all links first (they will be cascade deleted anyway, but this is cleaner)
    const deletedLinks = await db.link.deleteMany({});
    console.log(`Deleted ${deletedLinks.count} links.`);

    // Delete all concepts (this will cascade delete any remaining links)
    const deletedConcepts = await db.concept.deleteMany({});
    console.log(`Deleted ${deletedConcepts.count} concepts.`);

    // Also clean up MRUConcept table (most recently used concepts)
    const deletedMRU = await db.mRUConcept.deleteMany({});
    if (deletedMRU.count > 0) {
      console.log(`Deleted ${deletedMRU.count} MRU concept records.`);
    }

    console.log("✅ Successfully deleted all concepts and associated links!");
  } catch (error) {
    console.error("❌ Error deleting concepts:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

deleteAllConcepts();

