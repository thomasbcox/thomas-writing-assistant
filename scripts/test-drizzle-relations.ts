/**
 * Test script to investigate Drizzle relation resolver issue
 * Tests both working and failing patterns to identify root cause
 */

import { db } from "../src/server/db";
import { link, concept, linkName } from "../src/server/schema";
import { eq } from "drizzle-orm";

async function testRelations() {
  console.log("=== Drizzle Relation Resolver Investigation ===\n");

  try {
    // Test 1: Working pattern - concept.outgoingLinks.linkName
    console.log("Test 1: concept.findFirst({ with: { outgoingLinks: { with: { linkName: true } } } })");
    try {
      const concepts = await db.select().from(concept).limit(1);
      if (concepts.length > 0) {
        const conceptWithLinks = await (db.query as any).concept.findFirst({
          where: eq(concept.id, concepts[0].id),
          with: {
            outgoingLinks: {
              with: {
                linkName: true,
              },
            },
          },
        });
        console.log("✅ SUCCESS: Working pattern executed");
        console.log(`   Found concept with ${conceptWithLinks?.outgoingLinks?.length || 0} outgoing links`);
      } else {
        console.log("⚠️  SKIPPED: No concepts in database");
      }
    } catch (error: any) {
      console.log("❌ FAILED:", error.message);
    }

    console.log("\n");

    // Test 2: Failing pattern - link.linkName directly
    console.log("Test 2: link.findMany({ with: { linkName: true } })");
    try {
      const links = await (db.query as any).link.findMany({
        with: {
          linkName: true,
        },
        limit: 1,
      });
      console.log("✅ SUCCESS: Direct link.linkName query worked!");
      console.log(`   Found ${links.length} links`);
    } catch (error: any) {
      console.log("❌ FAILED:", error.message);
      console.log("   Error details:", error.stack?.split("\n")[0]);
    }

    console.log("\n");

    // Test 3: Test link.source and link.target (should work)
    console.log("Test 3: link.findMany({ with: { source: true, target: true } })");
    try {
      const linksWithConcepts = await (db.query as any).link.findMany({
        with: {
          source: true,
          target: true,
        },
        limit: 1,
      });
      console.log("✅ SUCCESS: link.source and link.target work");
      console.log(`   Found ${linksWithConcepts.length} links`);
    } catch (error: any) {
      console.log("❌ FAILED:", error.message);
    }

    console.log("\n");

    // Test 4: Test all relations together
    console.log("Test 4: link.findMany({ with: { source: true, target: true, linkName: true } })");
    try {
      const linksFull = await (db.query as any).link.findMany({
        with: {
          source: true,
          target: true,
          linkName: true,
        },
        limit: 1,
      });
      console.log("✅ SUCCESS: All relations together work");
      console.log(`   Found ${linksFull.length} links`);
    } catch (error: any) {
      console.log("❌ FAILED:", error.message);
      console.log("   Error details:", error.stack?.split("\n")[0]);
    }

    console.log("\n");

    // Test 5: Test linkName.links (reverse relation)
    console.log("Test 5: linkName.findMany({ with: { links: true } })");
    try {
      const linkNames = await (db.query as any).linkName.findMany({
        with: {
          links: true,
        },
        limit: 1,
      });
      console.log("✅ SUCCESS: linkName.links (reverse relation) works");
      console.log(`   Found ${linkNames.length} link names`);
    } catch (error: any) {
      console.log("❌ FAILED:", error.message);
    }

    console.log("\n");

    // Test 6: Check if linkName table has data
    console.log("Test 6: Verify linkName table has data");
    try {
      const linkNameCount = await db.select().from(linkName);
      console.log(`   Found ${linkNameCount.length} link names in database`);
      if (linkNameCount.length > 0) {
        console.log(`   Sample: ${linkNameCount[0].forwardName} → ${linkNameCount[0].reverseName}`);
      }
    } catch (error: any) {
      console.log("❌ FAILED:", error.message);
    }

    console.log("\n");

    // Test 7: Check if link table has data with linkNameId
    console.log("Test 7: Verify link table has data with linkNameId");
    try {
      const linkCount = await db.select().from(link);
      console.log(`   Found ${linkCount.length} links in database`);
      if (linkCount.length > 0) {
        console.log(`   Sample link has linkNameId: ${linkCount[0].linkNameId}`);
        // Verify the linkNameId exists
        const linkNameRecord = await db
          .select()
          .from(linkName)
          .where(eq(linkName.id, linkCount[0].linkNameId))
          .limit(1);
        if (linkNameRecord.length > 0) {
          console.log(`   ✅ linkNameId is valid: ${linkNameRecord[0].forwardName}`);
        } else {
          console.log(`   ⚠️  linkNameId ${linkCount[0].linkNameId} not found in linkName table`);
        }
      }
    } catch (error: any) {
      console.log("❌ FAILED:", error.message);
    }

  } catch (error: any) {
    console.error("Fatal error:", error);
  }

  process.exit(0);
}

testRelations();
