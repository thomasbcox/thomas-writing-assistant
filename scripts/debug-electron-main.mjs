#!/usr/bin/env node
/**
 * Debug script to check what Electron will see for the main entry point
 */

import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// #region agent log
fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-electron-main.mjs:15',message:'Reading package.json',data:{projectRoot},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

const packageJsonPath = join(projectRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// #region agent log
fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-electron-main.mjs:22',message:'Package.json main field',data:{main:packageJson.main,packageJsonPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

const mainPath = packageJson.main;
const resolvedMainPath = resolve(projectRoot, mainPath);

// #region agent log
fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-electron-main.mjs:29',message:'Resolved main path',data:{mainPath,resolvedMainPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

import { existsSync } from 'fs';

const fileExists = existsSync(resolvedMainPath);

// #region agent log
fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-electron-main.mjs:37',message:'File existence check',data:{resolvedMainPath,fileExists},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
// #endregion

console.log('Package.json main field:', mainPath);
console.log('Resolved path:', resolvedMainPath);
console.log('File exists:', fileExists);

// Check alternative paths
const altPath1 = resolve(projectRoot, 'dist-electron/main.js');
const altPath2 = resolve(projectRoot, 'dist-electron/electron/main.js');

// #region agent log
fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-electron-main.mjs:48',message:'Alternative path checks',data:{altPath1:existsSync(altPath1),altPath2:existsSync(altPath2)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
// #endregion

console.log('Alternative path 1 (dist-electron/main.js) exists:', existsSync(altPath1));
console.log('Alternative path 2 (dist-electron/electron/main.js) exists:', existsSync(altPath2));

