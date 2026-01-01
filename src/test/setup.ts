import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Polyfill TextEncoder/TextDecoder for jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill BroadcastChannel for jsdom
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

// Polyfill WritableStream, ReadableStream, and TransformStream for jsdom
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';
// @ts-expect-error - Adding polyfills to global
global.ReadableStream = ReadableStream;
// @ts-expect-error - Adding polyfills to global
global.WritableStream = WritableStream;
// @ts-expect-error - Adding polyfills to global
global.TransformStream = TransformStream;

// Polyfill fetch API for jsdom
import 'whatwg-fetch';

// Prevent accidental database initialization in tests
// Individual test files should mock ~/server/db explicitly
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}

// Mock pdf-parse globally to handle dynamic imports
// This ensures the mock is available when services use await import("pdf-parse")
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

// Mock better-sqlite3 globally to avoid native module issues in tests
// The mock is defined in src/test/__mocks__/better-sqlite3.ts
// Jest will automatically use it when better-sqlite3 is imported
