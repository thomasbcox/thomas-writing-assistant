#!/usr/bin/env node
/**
 * Post-build script to fix import paths in compiled Electron files
 * Replaces ~/ path aliases with relative paths and ensures .js extensions
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distElectron = join(__dirname, '..', 'dist-electron');
const distElectronSrc = join(distElectron, 'src');

function fixImportsInFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Calculate relative path from current file's directory to dist-electron/src
    // This is where ~/ imports should resolve to
    const currentDir = dirname(filePath);
    
    // Fix ~/ imports - convert to relative paths
    // ~/ means src/, so calculate relative path from current file's directory to src
    content = content.replace(/from\s+(['"])~\/(.*?)(\.js)?\1/g, (match, quote, aliasPath, ext) => {
      // Calculate relative path from current file's directory to dist-electron/src
      let relativePath = relative(currentDir, distElectronSrc);
      
      // Normalize path separators for cross-platform compatibility
      relativePath = relativePath.split(sep).join('/');
      
      // If same directory, use '.'
      if (!relativePath || relativePath === '') {
        relativePath = '.';
      }
      // If not starting with . or .., prepend ./
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      
      // Construct new import path
      let newImportPath = `${relativePath}/${aliasPath}`;
      
      // Ensure .js extension if it's a file import (not ending in .json or already .js)
      if (!ext && !newImportPath.endsWith('.json') && !newImportPath.endsWith('.js')) {
        newImportPath += '.js';
      }
      
      return `from ${quote}${newImportPath}${quote}`;
    });
    
    // Fix ../src/ imports - replace with correct relative path and add .js extension if missing
    content = content.replace(/from\s+(['"])(\.\.\/src\/[^'"]+?)(\.js)?\1/g, (match, quote, importPath, ext) => {
      // Calculate relative path from current file to dist-electron/src
      let relativePath = relative(currentDir, distElectronSrc);
      relativePath = relativePath.split(sep).join('/');
      
      // If same directory, use '.'
      if (!relativePath || relativePath === '') {
        relativePath = '.';
      }
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      
      // Extract the path after src/ from the import
      const pathAfterSrc = importPath.replace(/^\.\.\/src\//, '');
      const newPath = `${relativePath}/${pathAfterSrc}`;
      const withExt = ext ? newPath : newPath + '.js';
      return `from ${quote}${withExt}${quote}`;
    });
    
    // Fix other relative imports (./something or ../something) - add .js extension if missing
    // Skip if already has extension, or if it's a node_modules import, or absolute URL
    content = content.replace(/from\s+(['"])(\.{1,2}\/[^'"]+?)(\1)/g, (match, quote, importPath, endQuote) => {
      // Skip if already has .js or .json extension, or if it's a special case
      if (importPath.endsWith('.js') || importPath.endsWith('.json') || 
          importPath.includes('node_modules') || importPath.includes('://')) {
        return match;
      }
      // Add .js extension
      return `from ${quote}${importPath}.js${endQuote}`;
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

// Create symlink for Electron main entry point
// Electron sometimes looks for dist-electron/main.js instead of dist-electron/electron/main.js
import { symlinkSync, existsSync as fileExists, unlinkSync } from 'fs';
const mainSymlinkPath = join(distElectron, 'main.js');
const mainActualPath = join(distElectron, 'electron', 'main.js');

try {
  // Remove existing symlink or file if it exists
  if (fileExists(mainSymlinkPath)) {
    try {
      unlinkSync(mainSymlinkPath);
    } catch (e) {
      // Ignore errors removing old symlink
    }
  }
  
  // Create symlink if the actual file exists
  // Use relative path for portability
  if (fileExists(mainActualPath)) {
    const relativePath = relative(distElectron, mainActualPath);
    symlinkSync(relativePath, mainSymlinkPath);
    console.log(`✅ Created symlink: ${mainSymlinkPath} -> ${relativePath}`);
  }
} catch (error) {
  // Symlink creation is optional, don't fail the build
  console.warn(`⚠️  Could not create main.js symlink: ${error.message}`);
}

