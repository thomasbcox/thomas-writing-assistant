/**
 * Export all data from DEV database and import into PROD database
 * Uses SQLite ATTACH to copy data directly, avoiding date conversion issues
 * Usage: npx tsx scripts/export-dev-to-prod.ts
 */

import Database from "better-sqlite3";

const DEV_DB_PATH = "./dev.db";
const PROD_DB_PATH = "./prod.db";

async function main() {
  try {
    console.log("🔄 Starting DEV to PROD data migration...\n");
    
    // Check if databases exist
    const fs = await import("fs");
    if (!fs.existsSync(DEV_DB_PATH)) {
      throw new Error(`DEV database not found: ${DEV_DB_PATH}`);
    }
    if (!fs.existsSync(PROD_DB_PATH)) {
      throw new Error(`PROD database not found: ${PROD_DB_PATH}`);
    }

    // Open PROD database
    const prodDb = new Database(PROD_DB_PATH);
    
    try {
      // Attach DEV database
      console.log("📤 Attaching DEV database...");
      prodDb.exec(`ATTACH DATABASE '${DEV_DB_PATH}' AS dev_db`);
      
      // Clear existing PROD data
      console.log("  🗑️  Clearing existing PROD data...");
      prodDb.exec("DELETE FROM MRUConcept");
      prodDb.exec("DELETE FROM RepurposedContent");
      prodDb.exec("DELETE FROM Anchor");
      prodDb.exec("DELETE FROM Link");
      prodDb.exec("DELETE FROM Capsule");
      prodDb.exec("DELETE FROM Concept");
      prodDb.exec("DELETE FROM LinkName");
      console.log("    ✅ Cleared existing data");

      // Copy data in dependency order
      console.log("\n📥 Copying data from DEV to PROD...");
      
      const tables = [
        { name: "LinkName", order: 1 },
        { name: "Concept", order: 2 },
        { name: "Capsule", order: 3 },
        { name: "Link", order: 4 },
        { name: "Anchor", order: 5 },
        { name: "RepurposedContent", order: 6 },
        { name: "MRUConcept", order: 7 },
      ];

      let totalImported = 0;

      for (const table of tables) {
        // Get column names from the table
        const columns = prodDb
          .prepare(`PRAGMA table_info(${table.name})`)
          .all() as Array<{ name: string }>;
        const columnNames = columns.map(c => c.name).join(", ");

        // Count records in source
        const countResult = prodDb
          .prepare(`SELECT COUNT(*) as count FROM dev_db.${table.name}`)
          .get() as { count: number };
        const count = countResult.count;

        if (count > 0) {
          console.log(`  Copying ${count} records from ${table.name}...`);
          
          // Copy all data
          prodDb.exec(`INSERT INTO ${table.name} (${columnNames}) SELECT ${columnNames} FROM dev_db.${table.name}`);
          
          totalImported += count;
          console.log(`    ✅ Copied ${count} ${table.name} records`);
        } else {
          console.log(`  ⏭️  Skipping ${table.name} (empty)`);
        }
      }

      // Detach DEV database
      prodDb.exec("DETACH DATABASE dev_db");

      console.log(`\n✅ Migration complete! Total records imported: ${totalImported}`);
      console.log("🎉 All DEV data has been imported into PROD.");
    } finally {
      prodDb.close();
    }
  } catch (error) {
    console.error("\n❌ Error during migration:", error);
    process.exit(1);
  }
}

main();
