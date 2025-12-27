/**
 * Setup utility for API route tests using in-memory database
 * Handles ESM mocking complexity for getDb() and getCurrentDb()
 */

import { jest } from "@jest/globals";
import { createTestDb, migrateTestDb, closeTestDb } from "../test-utils";
import type { ReturnType } from "~/server/db";

type Database = ReturnType<typeof import("~/server/db").db>;

// Global storage for test database (accessible to mocks)
declare global {
  var __TEST_DB__: Database | null;
}

/**
 * Sets up mocks for API route tests
 * Call this at the top level of test files (before imports)
 */
export function setupInMemoryDbMocks() {
  // Initialize global storage
  global.__TEST_DB__ = null;

  // Mock getDb() - factory runs at hoist, function checks global at execution
  // For ESM, we need to use async import in the factory
  jest.mock("~/server/api/helpers", () => {
    const getDbMock = jest.fn(() => {
      if (!global.__TEST_DB__) {
        throw new Error("Test database not initialized. Call initInMemoryDb() in beforeAll.");
      }
      return global.__TEST_DB__;
    });

    // Import actual module for other functions (this works because it's in the factory)
    // Note: This is synchronous in the factory, but the actual import happens lazily
    let actualModule: any = null;
    const getActual = () => {
      if (!actualModule) {
        // Use require for synchronous access in factory
        try {
          actualModule = require("~/server/api/helpers");
        } catch {
          // If require fails (ESM), we'll handle it in initInMemoryDb
          actualModule = { __esm: true };
        }
      }
      return actualModule;
    };

    return {
      getDb: getDbMock,
      // Delegate to actual implementations
      handleApiError: async (error: unknown) => {
        const actual = getActual();
        if (actual.__esm) {
          const mod = await import("~/server/api/helpers");
          return mod.handleApiError(error);
        }
        return actual.handleApiError(error);
      },
      parseJsonBody: async (request: any) => {
        const actual = getActual();
        if (actual.__esm) {
          const mod = await import("~/server/api/helpers");
          return mod.parseJsonBody(request);
        }
        return actual.parseJsonBody(request);
      },
      getQueryParam: (request: any, key: string) => {
        const actual = getActual();
        if (actual.__esm) {
          // For ESM, we need to implement inline or use a sync version
          const { searchParams } = new URL(request.url);
          return searchParams.get(key) ?? undefined;
        }
        return actual.getQueryParam(request, key);
      },
      getQueryParamBool: (request: any, key: string, defaultValue = false) => {
        const actual = getActual();
        if (actual.__esm) {
          const value = new URL(request.url).searchParams.get(key);
          if (value === undefined) return defaultValue;
          return value === "true" || value === "1";
        }
        return actual.getQueryParamBool(request, key, defaultValue);
      },
    };
  });

  // Mock getCurrentDb()
  jest.mock("~/server/db", () => ({
    getCurrentDb: jest.fn(() => {
      if (!global.__TEST_DB__) {
        throw new Error("Test database not initialized. Call initInMemoryDb() in beforeAll.");
      }
      return global.__TEST_DB__;
    }),
    getDatabasePreference: jest.fn(() => "dev"),
    getDatabasePath: jest.fn(() => "./dev.db"),
    reconnectDatabase: jest.fn(),
    schema: {},
    db: undefined as any,
  }));
}

/**
 * Initialize in-memory test database
 * Call this in beforeAll hook
 */
export async function initInMemoryDb(): Promise<Database> {
  const testDb = createTestDb();
  await migrateTestDb(testDb);
  
  // Store in global so getCurrentDb() can access it
  // This works around Jest's ESM mocking limitations
  global.__TEST_DB__ = testDb;
  
  // Import actual helpers (for reference, though we don't need to update mocks anymore)
  await import("~/server/api/helpers");
  
  // Access mocked modules - for ESM we need to use a different approach
  // The mocks are already set up to check global.__TEST_DB__, so we just need to set it
  // The mock functions will automatically use the testDb when called
  
  // However, we still need to provide the actual implementations for other functions
  // Since we can't easily modify ESM mocks, we'll need to ensure the mock factory
  // returns functions that delegate to actual implementations
  // For now, the mocks return undefined for non-getDb functions, which will cause errors
  // We need to fix the mock factory to import actual functions
  
  return testDb;
}

/**
 * Clean up test database
 * Call this in afterAll hook
 */
export function cleanupInMemoryDb() {
  if (global.__TEST_DB__) {
    closeTestDb(global.__TEST_DB__);
    global.__TEST_DB__ = null;
  }
}
