#!/usr/bin/env node
/**
 * Post-install script for Prisma 7 client
 * Creates default.js for CommonJS compatibility with Vitest
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const prismaClientPath = join(process.cwd(), 'node_modules', '.prisma', 'client');
const defaultDtsPath = join(prismaClientPath, 'default.d.ts');
const defaultJsPath = join(process.cwd(), 'node_modules', '@prisma', 'client', 'default.js');

if (!existsSync(prismaClientPath)) {
  console.log('Prisma client not generated yet. Run `npx prisma generate` first.');
  process.exit(0);
}

// Ensure default.d.ts exists
if (!existsSync(defaultDtsPath)) {
  writeFileSync(defaultDtsPath, `export * from './client'\n`);
}

// Update default.mjs - keep it simple, let tsx/bundlers handle TypeScript
const defaultMjsPath = join(prismaClientPath, 'default.mjs');
if (existsSync(defaultMjsPath)) {
  // Read current content
  const currentContent = existsSync(defaultMjsPath) 
    ? readFileSync(defaultMjsPath, 'utf-8')
    : '';
  
  if (!currentContent.includes('client')) {
    writeFileSync(defaultMjsPath, `// Prisma Client default export
// Re-export from the client (tsx/bundlers will handle TypeScript)
export * from './client';
`);
  }
}

// Create/update default.js for @prisma/client (needed for Jest and Node.js)
// Always update this file to ensure Jest compatibility
// Use ESM export - Jest with experimental-vm-modules should handle it
writeFileSync(defaultJsPath, `// Prisma Client entry point
// Export from the generated Prisma client
// Jest with experimental-vm-modules will handle ESM
export * from '../../.prisma/client/default.mjs';
export { PrismaClient } from '../../.prisma/client/default.mjs';
`);

console.log('✅ Prisma client setup complete');

