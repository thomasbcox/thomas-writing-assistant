/**
 * Helper for creating Drizzle-style database mocks for API route tests
 */

import { jest } from "@jest/globals";

export type MockDb = ReturnType<typeof createDrizzleMockDb>;

/**
 * Creates a Drizzle-style mock database
 */
export function createDrizzleMockDb() {
  // Track resolve values for query builders
  let selectResolveValue: unknown[] = [];
  let insertResolveValue: unknown[] = [];
  let updateResolveValue: unknown[] = [];
  let deleteResolveValue: unknown[] = [];
  
  // Track errors for query builders
  let selectError: Error | null = null;
  let insertError: Error | null = null;
  let updateError: Error | null = null;
  let deleteError: Error | null = null;
  
  // Track multiple results for concurrent operations
  const insertResults: unknown[][] = [];

  // Chainable query builder factory - needs to access closure variables
  const createQueryBuilder = (type: "select" | "insert" | "update" | "delete") => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orderBy: jest.fn((...args: unknown[]) => {
        if (type === "select") {
          // Check current error state from closure at execution time
          if (selectError) {
            const err = selectError; // Capture current error
            return Promise.reject(err);
          }
          return Promise.resolve(selectResolveValue);
        }
        return Promise.resolve([]);
      }),
      returning: jest.fn(() => {
        if (type === "insert") {
          // Check current error state from closure
          if (insertError) {
            const err = insertError; // Capture current error
            return Promise.reject(err);
          }
          // Support multiple results for concurrent operations
          if (insertResults.length > 0) {
            const result = insertResults.shift();
            return Promise.resolve(result ?? insertResolveValue);
          }
          return Promise.resolve(insertResolveValue);
        }
        if (type === "update") {
          if (updateError) {
            return Promise.reject(updateError);
          }
          return Promise.resolve(updateResolveValue);
        }
        if (type === "delete") {
          if (deleteError) {
            return Promise.reject(deleteError);
          }
          return Promise.resolve(deleteResolveValue);
        }
        return Promise.resolve([]);
      }),
      limit: jest.fn().mockReturnThis(),
    };
    // Make where() handle undefined (Drizzle allows this)
    builder.where = jest.fn((clause) => {
      // If clause is undefined, still return builder
      return clause === undefined ? builder : builder;
    });
    return builder;
  };

  let selectBuilder = createQueryBuilder("select");
  let insertBuilder = createQueryBuilder("insert");
  let updateBuilder = createQueryBuilder("update");
  let deleteBuilder = createQueryBuilder("delete");

  const mockDb = {
    select: jest.fn(() => selectBuilder),
    insert: jest.fn(() => insertBuilder),
    update: jest.fn(() => updateBuilder),
    delete: jest.fn(() => deleteBuilder),
    query: {
      concept: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      link: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      linkName: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      capsule: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      anchor: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      repurposedContent: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      mRUConcept: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    },
    // Helper methods to set resolve values
    _setSelectResult: (value: unknown[]) => {
      selectResolveValue = value;
      selectError = null;
      selectBuilder.orderBy = jest.fn(() => Promise.resolve(value));
    },
    _setInsertResult: (value: unknown[], index?: number) => {
      if (index !== undefined) {
        insertResults[index] = value;
      } else {
        insertResolveValue = value;
        insertResults.length = 0; // Clear array results
      }
      insertError = null;
      insertBuilder.returning = jest.fn(() => {
        if (insertError) {
          return Promise.reject(insertError);
        }
        if (insertResults.length > 0) {
          const result = insertResults.shift();
          return Promise.resolve(result ?? insertResolveValue);
        }
        return Promise.resolve(insertResolveValue);
      });
    },
    _setUpdateResult: (value: unknown[]) => {
      updateResolveValue = value;
      updateError = null;
      updateBuilder.returning = jest.fn(() => Promise.resolve(value));
    },
    _setDeleteResult: (value: unknown[]) => {
      deleteResolveValue = value;
      deleteError = null;
      deleteBuilder.returning = jest.fn(() => Promise.resolve(value));
    },
    // Helper methods to set errors
    _setSelectError: (error: Error | null) => {
      selectError = error;
      selectResolveValue = [];
      // Update orderBy to check current error state from closure at execution time
      // The closure will capture the current value of selectError when orderBy is called
      // Note: orderBy can be called with arguments (like desc(column)), but we ignore them
      selectBuilder.orderBy = jest.fn((...args: unknown[]) => {
        // Check selectError from closure - this will be the current value when called
        if (selectError) {
          return Promise.reject(selectError);
        }
        return Promise.resolve(selectResolveValue);
      });
    },
    _setInsertError: (error: Error | null) => {
      insertError = error;
      insertResolveValue = [];
      insertResults.length = 0;
      // Update returning to check current error state - use closure to capture current error
      const currentError = error; // Capture error at time of setting
      insertBuilder.returning = jest.fn(() => {
        if (currentError) {
          return Promise.reject(currentError);
        }
        if (insertResults.length > 0) {
          const result = insertResults.shift();
          return Promise.resolve(result ?? insertResolveValue);
        }
        return Promise.resolve(insertResolveValue);
      });
    },
    _setUpdateError: (error: Error | null) => {
      updateError = error;
      updateResolveValue = [];
      if (error) {
        updateBuilder.returning = jest.fn(() => Promise.reject(error));
      } else {
        updateBuilder.returning = jest.fn(() => Promise.resolve(updateResolveValue));
      }
    },
    _setDeleteError: (error: Error | null) => {
      deleteError = error;
      deleteResolveValue = [];
      if (error) {
        deleteBuilder.returning = jest.fn(() => Promise.reject(error));
      } else {
        deleteBuilder.returning = jest.fn(() => Promise.resolve(deleteResolveValue));
      }
    },
    _selectBuilder: selectBuilder,
    _insertBuilder: insertBuilder,
    _updateBuilder: updateBuilder,
    _deleteBuilder: deleteBuilder,
  };

  return mockDb;
}

// Store mockDb instance globally so tests can access it
let globalMockDbInstance: ReturnType<typeof createDrizzleMockDb> | null = null;

/**
 * Sets up mocks for API route tests
 * Note: jest.mock is hoisted, so we need to create the mock inside the factory
 */
export function setupApiRouteMocks() {
  // Create mock inside factory (jest.mock is hoisted)
  const mockDbInstance = createDrizzleMockDb();
  globalMockDbInstance = mockDbInstance; // Store globally for test access

  jest.mock("~/server/api/helpers", () => {
    const actual = jest.requireActual("~/server/api/helpers");
    const mockHelpers = {
      ...actual,
      getDb: jest.fn(() => mockDbInstance),
    };
    // Add __mockDb as a non-enumerable property so it's available but doesn't interfere
    Object.defineProperty(mockHelpers, "__mockDb", {
      value: mockDbInstance,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    return mockHelpers;
  });

  jest.mock("~/server/db", () => ({
    db: mockDbInstance,
    getCurrentDb: jest.fn(() => mockDbInstance),
    getDatabasePreference: jest.fn(() => "dev"),
    getDatabasePath: jest.fn(() => "./dev.db"),
    reconnectDatabase: jest.fn(),
    schema: {},
    __mockDb: mockDbInstance, // Also export for test access
  }));

  return mockDbInstance;
}

/**
 * Get the mockDb instance (for use in tests after mocks are set up)
 */
export function getMockDb(): ReturnType<typeof createDrizzleMockDb> {
  if (!globalMockDbInstance) {
    throw new Error("MockDb not initialized - setupApiRouteMocks() must be called first");
  }
  return globalMockDbInstance;
}
