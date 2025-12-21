/**
 * Migration script to convert LinkName table from single names to forward/reverse pairs
 * and update Link table to use linkNameId instead of forwardName/reverseName strings
 * 
 * Run this after applying the schema migration but before removing forwardName/reverseName columns
 */

import { db } from "../src/server/db";
import { link, linkName } from "../src/server/schema";
import { eq, and, sql } from "drizzle-orm";
import Database from "better-sqlite3";
import { env } from "../src/env";
import { createId } from "@paralleldrive/cuid2";

const DEFAULT_LINK_NAME_PAIRS: Array<{ forward: string; reverse: string }> = [
  { forward: "belongs to", reverse: "contains" },
  { forward: "references", reverse: "referenced by" },
  { forward: "is a subset of", reverse: "is a superset of" },
  { forward: "builds on", reverse: "built on by" },
  { forward: "contradicts", reverse: "contradicted by" },
  { forward: "related to", reverse: "related to" }, // symmetric
  { forward: "example of", reverse: "exemplified by" },
  { forward: "prerequisite for", reverse: "requires" },
  { forward: "extends", reverse: "extended by" },
  { forward: "similar to", reverse: "similar to" }, // symmetric
  { forward: "part of", reverse: "contains" },
  { forward: "contains", reverse: "part of" },
  { forward: "inspired by", reverse: "inspired" },
  { forward: "opposes", reverse: "opposed by" },
];

async function migrateLinkNames() {
  console.log("Starting LinkName migration...");

  try {
    const sqlite = (db as any).$client || (db as any).session?.client as InstanceType<typeof Database> | undefined;
    if (!sqlite) {
      throw new Error("Cannot access SQLite client for migration");
    }

    // Step 0: Migrate LinkName table structure if needed
    const linkNameTableInfo = sqlite
      .prepare("PRAGMA table_info(LinkName)")
      .all() as Array<{ name: string; type: string }>;
    const hasForwardName = linkNameTableInfo.some((col) => col.name === "forwardName");
    
    if (!hasForwardName) {
      console.log("Migrating LinkName table structure...");
      // Create new LinkName table structure
      sqlite.exec(`
        CREATE TABLE LinkName_new (
          id TEXT PRIMARY KEY NOT NULL,
          forwardName TEXT NOT NULL UNIQUE,
          reverseName TEXT NOT NULL,
          isSymmetric INTEGER DEFAULT 0 NOT NULL,
          isDefault INTEGER DEFAULT 0 NOT NULL,
          isDeleted INTEGER DEFAULT 0 NOT NULL,
          createdAt INTEGER NOT NULL
        );
        
        -- Migrate existing LinkName data (treat as symmetric pairs)
        INSERT INTO LinkName_new (id, forwardName, reverseName, isSymmetric, isDefault, isDeleted, createdAt)
        SELECT id, name as forwardName, name as reverseName, 1 as isSymmetric, isDefault, isDeleted, createdAt
        FROM LinkName;
        
        DROP TABLE LinkName;
        ALTER TABLE LinkName_new RENAME TO LinkName;
        
        CREATE INDEX LinkName_forwardName_idx ON LinkName(forwardName);
        CREATE INDEX LinkName_reverseName_idx ON LinkName(reverseName);
      `);
      console.log("✓ LinkName table structure migrated");
    } else {
      console.log("LinkName table already has new structure");
    }
    // Step 1: Get all existing links to see what forward/reverse pairs exist
    // Use raw SQL to read old structure (forwardName/reverseName columns)

    const existingLinks = sqlite
      .prepare("SELECT id, sourceId, targetId, forwardName, reverseName, notes, createdAt FROM Link")
      .all() as Array<{
        id: string;
        sourceId: string;
        targetId: string;
        forwardName: string;
        reverseName: string;
        notes: string | null;
        createdAt: number;
      }>;
    console.log(`Found ${existingLinks.length} existing links`);

    // Step 2: Collect all unique forward/reverse pairs from existing links
    const linkPairs = new Map<string, { forward: string; reverse: string }>();
    
    for (const linkRecord of existingLinks) {
      const key = `${linkRecord.forwardName}|${linkRecord.reverseName}`;
      if (!linkPairs.has(key)) {
        linkPairs.set(key, {
          forward: linkRecord.forwardName,
          reverse: linkRecord.reverseName,
        });
      }
    }

    console.log(`Found ${linkPairs.size} unique link name pairs`);

    // Step 3: Create LinkName records for all pairs
    const linkNameMap = new Map<string, string>(); // Map forward|reverse -> linkNameId

    // First, create default pairs
    for (const pair of DEFAULT_LINK_NAME_PAIRS) {
      const isSymmetric = pair.forward === pair.reverse;
      const key = `${pair.forward}|${pair.reverse}`;
      
      // Check if already exists (LinkName table should now have new structure)
      const existing = sqlite
        .prepare("SELECT id FROM LinkName WHERE forwardName = ? AND reverseName = ?")
        .get(pair.forward, pair.reverse) as { id: string } | undefined;

      if (!existing) {
        const newId = createId();
        sqlite
          .prepare(
            "INSERT INTO LinkName (id, forwardName, reverseName, isSymmetric, isDefault, isDeleted, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            newId,
            pair.forward,
            pair.reverse,
            isSymmetric ? 1 : 0,
            1, // isDefault
            0, // isDeleted
            Date.now(),
          );

        linkNameMap.set(key, newId);
        console.log(`Created default LinkName: ${pair.forward} → ${pair.reverse}`);
      } else {
        linkNameMap.set(key, existing.id);
      }
    }

    // Then, create LinkName records for any custom pairs found in links
    for (const [key, pair] of linkPairs.entries()) {
      if (!linkNameMap.has(key)) {
        const isSymmetric = pair.forward === pair.reverse;
        const newId = createId();
        sqlite
          .prepare(
            "INSERT INTO LinkName (id, forwardName, reverseName, isSymmetric, isDefault, isDeleted, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            newId,
            pair.forward,
            pair.reverse,
            isSymmetric ? 1 : 0,
            0, // isDefault
            0, // isDeleted
            Date.now(),
          );

        linkNameMap.set(key, newId);
        console.log(`Created custom LinkName: ${pair.forward} → ${pair.reverse}`);
      }
    }

    // Step 4: Add linkNameId column to Link table if it doesn't exist
    const linkTableInfo = sqlite
      .prepare("PRAGMA table_info(Link)")
      .all() as Array<{ name: string; type: string }>;
    const hasLinkNameId = linkTableInfo.some((col) => col.name === "linkNameId");
    
    if (!hasLinkNameId) {
      try {
        sqlite.prepare("ALTER TABLE Link ADD COLUMN linkNameId TEXT").run();
        console.log("Added linkNameId column to Link table");
      } catch (e: any) {
        console.error("Failed to add linkNameId column:", e);
        throw e;
      }
    } else {
      console.log("linkNameId column already exists in Link table");
    }

    // Step 5: Update all Link records to use linkNameId
    let updatedCount = 0;
    const updateStmt = sqlite.prepare("UPDATE Link SET linkNameId = ? WHERE id = ?");
    
    for (const linkRecord of existingLinks) {
      const key = `${linkRecord.forwardName}|${linkRecord.reverseName}`;
      const linkNameId = linkNameMap.get(key);

      if (!linkNameId) {
        console.error(
          `ERROR: No LinkName found for pair: ${linkRecord.forwardName} → ${linkRecord.reverseName}`,
        );
        continue;
      }

      updateStmt.run(linkNameId, linkRecord.id);
      updatedCount++;
    }

    console.log(`Updated ${updatedCount} links with linkNameId`);

    // Step 6: Create LinkName pair for "related to" if it doesn't exist (for default fallback)
    const relatedToPair = sqlite
      .prepare("SELECT id FROM LinkName WHERE forwardName = ? AND reverseName = ?")
      .get("related to", "related to") as { id: string } | undefined;
    
    if (!relatedToPair) {
      const relatedToId = createId();
      sqlite
        .prepare(
          "INSERT INTO LinkName (id, forwardName, reverseName, isSymmetric, isDefault, isDeleted, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          relatedToId,
          "related to",
          "related to",
          1, // isSymmetric
          1, // isDefault
          0, // isDeleted
          Date.now(),
        );
      console.log("Created default 'related to' LinkName pair");
    }

    // Step 7: Set default linkNameId for any links that still don't have one
    const defaultLinkNameId = sqlite
      .prepare("SELECT id FROM LinkName WHERE forwardName = ? AND reverseName = ? LIMIT 1")
      .get("related to", "related to") as { id: string } | undefined;
    
    if (defaultLinkNameId) {
      const setDefaultStmt = sqlite.prepare("UPDATE Link SET linkNameId = ? WHERE linkNameId IS NULL");
      const defaultCount = setDefaultStmt.run(defaultLinkNameId.id).changes;
      if (defaultCount > 0) {
        console.log(`Set default linkNameId for ${defaultCount} links`);
      }
    }

    // Step 8: Verify migration
    const linksWithoutLinkNameId = sqlite
      .prepare("SELECT id FROM Link WHERE linkNameId IS NULL")
      .all() as Array<{ id: string }>;

    if (linksWithoutLinkNameId.length > 0) {
      console.error(
        `WARNING: ${linksWithoutLinkNameId.length} links still missing linkNameId`,
      );
    } else {
      console.log("✓ All links have linkNameId assigned");
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run migration
migrateLinkNames()
  .then(() => {
    console.log("Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
