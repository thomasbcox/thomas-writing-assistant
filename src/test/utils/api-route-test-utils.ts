/**
 * Utilities for testing API routes with in-memory database
 * This eliminates the need for complex database mocking
 */

import { jest } from "@jest/globals";
import type { ReturnType } from "~/server/db";
import { createTestDb, migrateTestDb, cleanupTestData, closeTestDb } from "../test-utils";

type Database = ReturnType<typeof import("~/server/db").db>;

/**
 * Sets up mocks for API route tests using real in-memory database
 * This replaces the complex drizzle-mock-helper approach
 * 
 * @returns The test database instance and cleanup function
 */
export function setupApiRouteTestDb() {
  // Create in-memory test database
  const testDb = createTestDb();
  
  // Initialize schema
  migrateTestDb(testDb);
  
  // Mock getDb() to return our test database
  jest.mock("~/server/api/helpers", () => {
    const actual = jest.requireActual("~/server/api/helpers");
    return {
      ...actual,
      getDb: jest.fn(() => testDb),
    };
  });
  
  // Mock getCurrentDb() as well (used by some code paths)
  jest.mock("~/server/db", () => {
    const actual = jest.requireActual("~/server/db");
    return {
      ...actual,
      getCurrentDb: jest.fn(() => testDb),
      db: testDb, // Also export for direct access if needed
    };
  });
  
  return {
    testDb,
    cleanup: async () => {
      await cleanupTestData(testDb);
    },
    close: () => {
      closeTestDb(testDb);
    },
  };
}

/**
 * Get the test database instance
 * Use this in tests after setupApiRouteTestDb() has been called
 */
export function getTestDb(): Database {
  // Try to get from mocked helpers
  const helpers = jest.requireMock("~/server/api/helpers");
  if (helpers.getDb) {
    return helpers.getDb();
  }
  
  // Fallback: try to get from mocked db module
  const dbModule = jest.requireMock("~/server/db");
  if (dbModule.getCurrentDb) {
    return dbModule.getCurrentDb();
  }
  
  throw new Error("Test database not set up. Call setupApiRouteTestDb() first.");
}
