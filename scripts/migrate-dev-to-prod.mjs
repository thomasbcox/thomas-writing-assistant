#!/usr/bin/env node

/**
 * Script to migrate data from dev.db to prod.db
 * 
 * This script uses SQLite's ATTACH DATABASE and INSERT INTO ... SELECT
 * to copy all data from dev.db to prod.db
 * 
 * Usage:
 *   node scripts/migrate-dev-to-prod.mjs
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Get database paths
const userDataDir = process.platform === 'darwin'
  ? join(homedir(), 'Library', 'Application Support', 'thomas-writing-assistant')
  : process.platform === 'win32'
  ? join(process.env.APPDATA || '', 'thomas-writing-assistant')
  : join(homedir(), '.config', 'thomas-writing-assistant');

const devDbPath = join(userDataDir, 'dev.db');
const prodDbPath = join(userDataDir, 'prod.db');

console.log('📊 Database Migration: dev.db → prod.db\n');
console.log(`Dev DB: ${devDbPath}`);
console.log(`Prod DB: ${prodDbPath}\n`);

// Check if dev.db exists
if (!existsSync(devDbPath)) {
  console.error(`❌ Error: dev.db not found at ${devDbPath}`);
  process.exit(1);
}

try {
  // Step 1: Backup prod.db if it exists, then remove it
  if (existsSync(prodDbPath)) {
    const backupPath = `${prodDbPath}.backup.${Date.now()}`;
    console.log(`Step 1: Backing up existing prod.db to ${backupPath}...`);
    execSync(`cp "${prodDbPath}" "${backupPath}"`);
    console.log('✅ Backup complete');
    console.log('Removing existing prod.db...');
    execSync(`rm "${prodDbPath}"`);
    console.log('✅ Removed\n');
  } else {
    console.log('Step 1: prod.db does not exist, will be created\n');
  }

  // Step 2: Use SQLite VACUUM INTO command (creates a clean copy)
  console.log('Step 2: Copying dev.db to prod.db...');
  execSync(`sqlite3 "${devDbPath}" "VACUUM INTO '${prodDbPath}';"`, { stdio: 'inherit' });
  console.log('✅ Copy complete\n');

  // Step 3: Verify
  console.log('Step 3: Verifying migration...');
  const devTables = execSync(`sqlite3 "${devDbPath}" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"`, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  const prodTables = execSync(`sqlite3 "${prodDbPath}" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"`, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  
  console.log(`Dev tables: ${devTables.length}`);
  console.log(`Prod tables: ${prodTables.length}`);
  
  if (devTables.length === prodTables.length) {
    console.log('✅ Table count matches\n');
  } else {
    console.log('⚠️  Warning: Table count mismatch\n');
  }

  // Count records in each table
  console.log('Record counts:');
  for (const table of devTables) {
    if (table) {
      try {
        const devCount = execSync(`sqlite3 "${devDbPath}" "SELECT COUNT(*) FROM \\"${table}\\";"`, { encoding: 'utf-8' }).trim();
        const prodCount = execSync(`sqlite3 "${prodDbPath}" "SELECT COUNT(*) FROM \\"${table}\\";"`, { encoding: 'utf-8' }).trim();
        console.log(`  ${table}: dev=${devCount}, prod=${prodCount} ${devCount === prodCount ? '✅' : '⚠️'}`);
      } catch (err) {
        console.log(`  ${table}: Error counting records`);
      }
    }
  }

  console.log('\n✅ Migration complete!');
  console.log(`\nProduction database: ${prodDbPath}`);
  console.log('You can now use the app with NODE_ENV=production to use prod.db');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  if (error.stderr) {
    console.error('Error details:', error.stderr.toString());
  }
  process.exit(1);
}
