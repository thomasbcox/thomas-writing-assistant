/**
 * Shared setup for API route tests using in-memory database
 * This eliminates the need for complex database mocking
 */

import { jest } from "@jest/globals";
import { createTestDb, migrateTestDb, closeTestDb } from "../test-utils";
import type { ReturnType } from "~/server/db";

type Database = ReturnType<typeof import("~/server/db").db>;

// Global test database reference that mocks can access
const testDbRef: { current: Database | null } = { current: null };

/**
 * Sets up mocks for API route tests
 * Call this BEFORE importing route handlers
 */
export function setupApiRouteTestMocks() {
  // Mock getDb() to return test database
  jest.mock("~/server/api/helpers", () => {
    // Use dynamic import to avoid ESM issues
    return {
      getDb: jest.fn(() => {
        if (!testDbRef.current) {
          throw new Error("Test database not initialized. Call initTestDb() first.");
        }
        return testDbRef.current;
      }),
      handleApiError: jest.requireActual("~/server/api/helpers").handleApiError,
      parseJsonBody: jest.requireActual("~/server/api/helpers").parseJsonBody,
      getQueryParam: jest.requireActual("~/server/api/helpers").getQueryParam,
      getQueryParamBool: jest.requireActual("~/server/api/helpers").getQueryParamBool,
    };
  });

  // Mock getCurrentDb() 
  jest.mock("~/server/db", () => ({
    getCurrentDb: jest.fn(() => {
      if (!testDbRef.current) {
        throw new Error("Test database not initialized. Call initTestDb() first.");
      }
      return testDbRef.current;
    }),
    getDatabasePreference: jest.fn(() => "dev"),
    getDatabasePath: jest.fn(() => "./dev.db"),
    reconnectDatabase: jest.fn(),
    schema: {},
    db: undefined as any,
  }));
}

/**
 * Initialize test database
 * Call this in beforeAll hook
 */
export async function initTestDb(): Promise<Database> {
  const testDb = createTestDb();
  await migrateTestDb(testDb);
  testDbRef.current = testDb;
  
  // Update mocked modules
  const helpersModule = jest.requireMock("~/server/api/helpers");
  helpersModule.getDb.mockImplementation(() => testDb);
  
  const dbModule = jest.requireMock("~/server/db");
  dbModule.getCurrentDb.mockImplementation(() => testDb);
  dbModule.db = testDb;
  
  return testDb;
}

/**
 * Get the current test database
 */
export function getTestDb(): Database {
  if (!testDbRef.current) {
    throw new Error("Test database not initialized. Call initTestDb() first.");
  }
  return testDbRef.current;
}

/**
 * Close test database
 * Call this in afterAll hook
 */
export function cleanupTestDb() {
  if (testDbRef.current) {
    closeTestDb(testDbRef.current);
    testDbRef.current = null;
  }
}
