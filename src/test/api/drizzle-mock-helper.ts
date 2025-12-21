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

  // Chainable query builder for select/insert/update/delete
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
      orderBy: jest.fn(() => {
        if (type === "select") {
          return Promise.resolve(selectResolveValue);
        }
        return Promise.resolve([]);
      }),
      returning: jest.fn(() => {
        if (type === "insert") {
          return Promise.resolve(insertResolveValue);
        }
        if (type === "update") {
          return Promise.resolve(updateResolveValue);
        }
        if (type === "delete") {
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

  const selectBuilder = createQueryBuilder("select");
  const insertBuilder = createQueryBuilder("insert");
  const updateBuilder = createQueryBuilder("update");
  const deleteBuilder = createQueryBuilder("delete");

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
      selectBuilder.orderBy = jest.fn(() => Promise.resolve(value));
    },
    _setInsertResult: (value: unknown[]) => {
      insertResolveValue = value;
      insertBuilder.returning = jest.fn(() => Promise.resolve(value));
    },
    _setUpdateResult: (value: unknown[]) => {
      updateResolveValue = value;
      updateBuilder.returning = jest.fn(() => Promise.resolve(value));
    },
    _setDeleteResult: (value: unknown[]) => {
      deleteResolveValue = value;
      deleteBuilder.returning = jest.fn(() => Promise.resolve(value));
    },
    _selectBuilder: selectBuilder,
    _insertBuilder: insertBuilder,
    _updateBuilder: updateBuilder,
    _deleteBuilder: deleteBuilder,
  };

  return mockDb;
}

/**
 * Sets up mocks for API route tests
 * Note: jest.mock is hoisted, so we need to create the mock inside the factory
 */
export function setupApiRouteMocks() {
  // Create mock inside factory (jest.mock is hoisted)
  const mockDbInstance = createDrizzleMockDb();

  jest.mock("~/server/api/helpers", () => ({
    getDb: jest.fn(() => mockDbInstance),
    handleApiError: jest.fn((error: unknown) => {
      if (error instanceof Error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ error: "Unknown error" }), { status: 500 });
    }),
    parseJsonBody: jest.fn(async (request: Request) => {
      return await request.json();
    }),
    getQueryParam: jest.fn((request: Request, key: string) => {
      const url = new URL(request.url);
      return url.searchParams.get(key) ?? undefined;
    }),
    getQueryParamBool: jest.fn((request: Request, key: string, defaultValue: boolean) => {
      const url = new URL(request.url);
      const value = url.searchParams.get(key);
      if (value === null) return defaultValue;
      return value === "true";
    }),
    __mockDb: mockDbInstance,
  }));

  jest.mock("~/server/db", () => ({
    db: mockDbInstance,
    schema: {},
  }));

  return mockDbInstance;
}
