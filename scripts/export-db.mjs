#!/usr/bin/env node

/**
 * Script to export database to SQL dump file
 * 
 * Usage:
 *   node scripts/export-db.mjs [dev|prod] [output-file]
 * 
 * Examples:
 *   node scripts/export-db.mjs dev
 *   node scripts/export-db.mjs prod backup.sql
 */

import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Get database paths
const userDataDir = process.platform === 'darwin'
  ? join(homedir(), 'Library', 'Application Support', 'thomas-writing-assistant')
  : process.platform === 'win32'
  ? join(process.env.APPDATA || '', 'thomas-writing-assistant')
  : join(homedir(), '.config', 'thomas-writing-assistant');

const dbType = process.argv[2] || 'dev';
const outputFile = process.argv[3] || `${dbType}_export_${Date.now()}.sql`;

if (dbType !== 'dev' && dbType !== 'prod') {
  console.error('❌ Error: Database type must be "dev" or "prod"');
  process.exit(1);
}

const dbPath = join(userDataDir, `${dbType}.db`);
const outputPath = join(userDataDir, outputFile);

console.log(`📊 Exporting ${dbType}.db to SQL dump\n`);
console.log(`Source: ${dbPath}`);
console.log(`Output: ${outputPath}\n`);

// Check if database exists
if (!existsSync(dbPath)) {
  console.error(`❌ Error: ${dbType}.db not found at ${dbPath}`);
  process.exit(1);
}

try {
  console.log('Exporting...');
  execSync(`sqlite3 "${dbPath}" .dump > "${outputPath}"`, { stdio: 'inherit' });
  console.log(`\n✅ Export complete!`);
  console.log(`\nSQL dump saved to: ${outputPath}`);
  
  // Show file size
  const stats = statSync(outputPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`File size: ${sizeKB} KB`);
  
} catch (error) {
  console.error('❌ Export failed:', error.message);
  process.exit(1);
}

