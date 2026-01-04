#!/usr/bin/env node
/**
 * Debug script to instrument Jest coverage collection
 * Logs progress at key points to identify where hanging occurs
 */

import { writeFileSync, appendFileSync } from 'fs';
import { spawn } from 'child_process';

const LOG_PATH = '/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log';

function log(message, data = {}) {
  const entry = {
    location: 'debug-coverage.js',
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
  };
  appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
  console.log(`[DEBUG] ${message}`, data);
}

// Clear log file
try {
  writeFileSync(LOG_PATH, '');
} catch (e) {
  // File might not exist yet, that's ok
}

log('Starting coverage command', { 
  hypothesisId: 'A',
  command: process.argv.slice(2).join(' ')
});

// Parse command line arguments
const args = process.argv.slice(2);
const jestIndex = args.findIndex(arg => arg.includes('jest') || arg === 'test');
const jestArgs = jestIndex >= 0 ? args.slice(jestIndex + 1) : args;

log('Jest arguments parsed', { 
  hypothesisId: 'A',
  args: jestArgs 
});

// Check if collectCoverageFrom is in args
const collectCoverageIndex = jestArgs.findIndex(arg => arg.includes('collectCoverageFrom'));
if (collectCoverageIndex >= 0) {
  log('collectCoverageFrom argument found', { 
    hypothesisId: 'A',
    index: collectCoverageIndex,
    value: jestArgs[collectCoverageIndex]
  });
}

log('Spawning Jest process', { 
  hypothesisId: 'B',
  command: 'jest',
  args: jestArgs 
});

const jestProcess = spawn('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: '--experimental-vm-modules',
  }
});

let outputBuffer = '';
let lastLogTime = Date.now();

// Log periodically to detect hangs
const heartbeatInterval = setInterval(() => {
  const now = Date.now();
  const elapsed = now - lastLogTime;
  log('Heartbeat - process still running', { 
    hypothesisId: 'C',
    elapsedMs: elapsed,
    pid: jestProcess.pid 
  });
  lastLogTime = now;
}, 5000); // Every 5 seconds

jestProcess.on('spawn', () => {
  log('Jest process spawned', { 
    hypothesisId: 'B',
    pid: jestProcess.pid 
  });
});

jestProcess.on('error', (error) => {
  clearInterval(heartbeatInterval);
  log('Jest process error', { 
    hypothesisId: 'D',
    error: error.message,
    stack: error.stack 
  });
  process.exit(1);
});

jestProcess.on('exit', (code, signal) => {
  clearInterval(heartbeatInterval);
  log('Jest process exited', { 
    hypothesisId: 'E',
    code,
    signal,
    duration: Date.now() - (lastLogTime - 5000)
  });
  process.exit(code || 0);
});

// Handle timeout - if process runs longer than 60 seconds, log and kill
setTimeout(() => {
  if (jestProcess.exitCode === null && !jestProcess.killed) {
    log('Jest process timeout - process still running after 60s', { 
      hypothesisId: 'C',
      pid: jestProcess.pid 
    });
    jestProcess.kill('SIGTERM');
  }
}, 60000);

