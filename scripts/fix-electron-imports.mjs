#!/usr/bin/env node
/**
 * Post-build script to fix import paths in compiled Electron files
 * Replaces ../src/ imports with ./src/ for runtime resolution
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distElectron = join(__dirname, '..', 'dist-electron');

function fixImportsInFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Calculate relative path from this file's directory to dist-electron/src
    // filePath is absolute, distElectron is absolute, so normalize both
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const normalizedDistElectron = distElectron.replace(/\\/g, '/');
    const relativePath = normalizedFilePath.replace(normalizedDistElectron + '/', '').replace(/\/[^/]+$/, ''); // Remove filename, get directory
    const pathParts = relativePath.split('/').filter(p => p && p !== 'src'); // Exclude 'src' itself
    const depth = pathParts.length; // How many directories deep we are (excluding src)
    
    // Fix ~/ imports - convert to relative paths
    // ~/ means src/, so calculate relative path from current file's directory to src
    content = content.replace(/from (['"])~(\/[^'"]+?)(\.js)?\1/g, (match, quote, aliasPath, ext) => {
      // For files in dist-electron/src/server/services/llm/, ~/env means src/env
      // We need to go up 'depth' levels to get to src/, then reference the aliasPath
      const relativeToSrc = '../'.repeat(depth) + aliasPath.slice(1); // Remove leading / from aliasPath
      const withExt = ext ? relativeToSrc : relativeToSrc + '.js';
      return `from ${quote}${withExt}${quote}`;
    });
    
    // Fix ../src/ imports - replace with correct relative path and add .js extension if missing
    content = content.replace(/from (['"])(\.\.\/src\/[^'"]+?)(\.js)?\1/g, (match, quote, path, ext) => {
      // For files at dist-electron root (depth 0), ../src/ should become ./src/
      // For files in subdirectories, keep ../src/ but adjust if needed
      const newPath = depth === 0 ? path.replace(/^\.\.\/src\//, './src/') : path;
      const withExt = ext ? newPath : newPath + '.js';
      return `from ${quote}${withExt}${quote}`;
    });
    
    // Fix other relative imports (./something) - add .js extension if missing
    // Skip if already has extension, or if it's a node_modules import, or absolute URL
    content = content.replace(/from (['"])(\.[^'"]+?)(\1)/g, (match, quote, path, endQuote) => {
      // Skip if already has .js extension, or if it's a special case
      if (path.endsWith('.js') || path.includes('node_modules') || path.includes('://')) {
        return match;
      }
      // Add .js extension
      return `from ${quote}${path}.js${endQuote}`;
    });
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  let fixedCount = 0;
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and test directories
      if (entry === 'node_modules' || entry === 'test') {
        continue;
      }
      fixedCount += processDirectory(fullPath);
    } else if (entry.endsWith('.js') && !entry.endsWith('.test.js')) {
      if (fixImportsInFile(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

// Process dist-electron directory
const fixedCount = processDirectory(distElectron);
console.log(`✅ Fixed import paths in ${fixedCount} file(s)`);

