import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// CRITICAL: Set up polyfills BEFORE any MSW imports
// Polyfill TextEncoder/TextDecoder for jsdom (required for MSW)
import { TextEncoder, TextDecoder } from 'util';
// @ts-expect-error - Adding polyfills to global
global.TextEncoder = TextEncoder;
// @ts-expect-error - Adding polyfills to global  
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill BroadcastChannel for jsdom (required for MSW)
if (typeof BroadcastChannel === 'undefined') {
  // @ts-expect-error - Polyfill
  global.BroadcastChannel = class BroadcastChannel {
    constructor(public name: string) {}
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

// Polyfill WritableStream, ReadableStream, and TransformStream for jsdom (required for MSW)
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';
// @ts-expect-error - Adding polyfills to global
global.ReadableStream = ReadableStream;
// @ts-expect-error - Adding polyfills to global
global.WritableStream = WritableStream;
// @ts-expect-error - Adding polyfills to global
global.TransformStream = TransformStream;

// Polyfill fetch API for jsdom (required for MSW)
import 'whatwg-fetch';

// Lazy MSW setup - only initialize when needed to ensure polyfills are set first
// This avoids importing MSW code (which needs polyfills) at module load time
let server: any = null;
let serverPromise: Promise<any> | null = null;

async function getServer() {
  if (!server) {
    if (!serverPromise) {
      // Import MSW only after polyfills are guaranteed to be set
      // Use dynamic import (ESM) to ensure it happens after polyfills
      serverPromise = (async () => {
        const mswNode = await import('msw/node');
        const { trpcHandler } = await import('./utils/msw-handlers');
        return mswNode.setupServer(trpcHandler);
      })();
    }
    server = await serverPromise;
  }
  return server;
}

// Export server getter for use in tests
export { getServer as server };

// Prevent accidental Prisma client initialization in tests
// Individual test files should mock ~/server/db explicitly
// This is a safety net to prevent adapter errors
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}

// Establish API mocking before all tests
beforeAll(async () => {
  const mswServer = await getServer();
  console.log('[SETUP] MSW server created, about to listen');
  mswServer.listen({ onUnhandledRequest: 'warn' });
  console.log('[SETUP] MSW server listening');
});

// Reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-time error scenarios)
afterEach(async () => {
  const mswServer = await getServer();
  mswServer.resetHandlers();
});

// Clean up after the tests are finished
afterAll(async () => {
  const mswServer = await getServer();
  mswServer.close();
});

// Mock pdf-parse globally to handle dynamic imports
// This ensures the mock is available when routes use await import("pdf-parse")
// Note: jest.mock() should work for dynamic imports in Jest with ESM
jest.mock("pdf-parse", () => {
  class MockPDFParser {
    constructor(options: { data: Buffer }) {
      // Accept any buffer, even empty ones
    }
    async getText() {
      return { text: "Extracted PDF text content", total: 1 };
    }
    async getInfo() {
      return { info: { Title: "Test PDF" }, metadata: { Creator: "Test Creator" } };
    }
  }
  const MockPDFParserConstructor = MockPDFParser as any;
  return {
    __esModule: true,
    default: {
      PDFParse: MockPDFParser,
    },
    PDFParse: MockPDFParser,
    ...MockPDFParserConstructor,
  };
});

