/**
 * Polyfills for test environment
 * Must run BEFORE any other test setup to ensure globals are available
 * 
 * NOTE: Currently minimal - MSW polyfills are deferred due to ESM/undici issues
 */

import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder (needed for various libraries)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

// Polyfill for setImmediate (needed for pino logger in jsdom environment)
if (typeof global.setImmediate === "undefined") {
  (global as any).setImmediate = (fn: () => void, ...args: unknown[]) => {
    return setTimeout(fn, 0, ...args) as unknown as NodeJS.Immediate;
  };
  (global as any).clearImmediate = (id: NodeJS.Immediate | NodeJS.Timeout) => {
    clearTimeout(id as unknown as NodeJS.Timeout);
  };
}

// NOTE: MSW Fetch API polyfills are deferred
// MSW requires Response/Request/Headers/fetch globally
// Attempted to use undici, but it requires TextEncoder at import time
// ESM hoisting prevents setting TextEncoder before import
// TODO: Resolve this or use alternative approach (test server, Vitest, etc.)
