#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://thomasbcox@localhost:5432/thomas_writing_assistant?schema=public',
});

const exportDir = path.join(__dirname, '..', 'data-export');

async function importTable(tableName) {
  const filePath = path.join(exportDir, `${tableName}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  No export file found for ${tableName}, skipping...`);
    return { table: tableName, imported: 0, errors: 0 };
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let imported = 0;
  let errors = 0;

  console.log(`\nImporting ${tableName}... (${data.length} records)`);

  // Handle nested array structure from sqlite3 JSON export
  const records = Array.isArray(data[0]) ? data.flat() : data;
  
  for (const record of records) {
    try {
      if (!record || typeof record !== 'object' || Array.isArray(record)) continue;
      
      const keys = Object.keys(record);
      const values = keys.map(k => {
        const val = record[k];
        // Convert dates to ISO strings
        if (val instanceof Date) return val.toISOString();
        return val;
      });
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.map(k => `"${k}"`).join(', ');
      
      const query = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
      const result = await client.query(query, values);
      if (result.rowCount > 0) imported++;
    } catch (error) {
      const recordId = record?.id || 'unknown';
      console.error(`  ❌ Error importing ${tableName} record ${recordId}:`, error.message);
      errors++;
    }
  }

  console.log(`  ✅ Imported ${imported} records, ${errors} errors`);
  return { table: tableName, imported, errors };
}

async function main() {
  console.log('Starting Postgres data import...\n');

  await client.connect();

  const results = [];

  // Import in dependency order
  results.push(await importTable('LinkName'));
  results.push(await importTable('Concept'));
  results.push(await importTable('Capsule'));
  results.push(await importTable('Link'));
  results.push(await importTable('Anchor'));
  results.push(await importTable('RepurposedContent'));
  results.push(await importTable('MRUConcept'));

  console.log('\n' + '='.repeat(50));
  console.log('Import Summary:');
  console.log('='.repeat(50));
  results.forEach((r) => {
    console.log(`${r.table}: ${r.imported} imported, ${r.errors} errors`);
  });
  console.log('='.repeat(50));

  const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

  console.log(`\n✅ Import complete!`);
  console.log(`   Total: ${totalImported} records imported, ${totalErrors} errors`);

  await client.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

