/**
 * Test utilities for IPC handlers
 * Provides helpers for testing IPC handlers in isolation
 */

import { jest } from "@jest/globals";
import { ipcMain } from "electron";
import { createTestDb, migrateTestDb } from "./db";
import type { DatabaseInstance } from "~/server/db";

/**
 * Setup IPC handler testing environment
 * Creates test database, migrates schema, and sets up global test database
 * 
 * Note: You must mock getDb() in your test file using jest.mock() at module level
 * 
 * @returns Object with test database and cleanup function
 * 
 * @example
 * ```typescript
 * // At top of test file, before imports:
 * jest.mock("../../../electron/db.js", () => ({
 *   __esModule: true,
 *   getDb: jest.fn(),
 *   initDb: jest.fn(),
 * }));
 * 
 * describe("Concept IPC Handlers", () => {
 *   let testDb: DatabaseInstance;
 *   const { getDb } = jest.requireMock("../../../electron/db.js");
 *   
 *   beforeEach(async () => {
 *     const setup = await setupIPCTest();
 *     testDb = setup.db;
 *     getDb.mockReturnValue(testDb);
 *   });
 * });
 * ```
 */
export async function setupIPCTest(): Promise<{
  db: DatabaseInstance;
  cleanup: () => Promise<void>;
}> {
  const testDb = createTestDb();
  await migrateTestDb(testDb);

  // Set the global test database for getCurrentDb() fallback
  (globalThis as any).__TEST_DB__ = testDb;

  return {
    db: testDb,
    cleanup: async () => {
      // Cleanup is handled by individual test cleanup
      delete (globalThis as any).__TEST_DB__;
    },
  };
}

/**
 * Create a mock IPC event object
 * Useful for testing handlers that access event properties
 * 
 * @returns Mock IPC event object
 * 
 * @example
 * ```typescript
 * const event = createMockIpcEvent();
 * const handler = ipcMain.listeners("concept:list")[0];
 * const result = await handler(event, { includeTrash: false });
 * ```
 */
export function createMockIpcEvent() {
  return {
    sender: {
      send: jest.fn(),
    },
    returnValue: null,
    senderId: 1,
    frameId: 1,
    processId: 1,
  } as any;
}

/**
 * Invoke an IPC handler directly for testing
 * 
 * @param channel - The IPC channel name (e.g., "concept:list")
 * @param input - The input to pass to the handler
 * @returns The result from the handler
 * 
 * @example
 * ```typescript
 * const result = await invokeHandler("concept:list", { includeTrash: false });
 * expect(result).toEqual([]);
 * ```
 */
export async function invokeHandler<TInput, TOutput>(
  channel: string,
  input: TInput,
): Promise<TOutput> {
  const event = createMockIpcEvent();
  
  // Get the handler
  const handlers = ipcMain.listeners(channel);
  if (handlers.length === 0) {
    throw new Error(`No handler registered for channel: ${channel}`);
  }

  const handler = handlers[0] as (event: any, ...args: any[]) => Promise<TOutput>;
  return await handler(event, input);
}

/**
 * Register all IPC handlers for testing
 * This allows handlers to be tested in isolation
 * 
 * @example
 * ```typescript
 * beforeEach(async () => {
 *   await registerHandlersForTesting();
 * });
 * ```
 */
export async function registerHandlersForTesting(): Promise<void> {
  // Import and register handlers
  const { registerAllHandlers } = await import("../../../electron/ipc-handlers/index.js");
  registerAllHandlers();
}

/**
 * Set the global test database for getCurrentDb() fallback
 * Use this to configure the database that getCurrentDb() will return
 * 
 * @param db - The database instance to set as global test database
 * 
 * @example
 * ```typescript
 * const testDb = createTestDb();
 * await migrateTestDb(testDb);
 * setGlobalTestDb(testDb);
 * // Now getCurrentDb() will return testDb
 * ```
 */
export function setGlobalTestDb(db: DatabaseInstance): void {
  (globalThis as any).__TEST_DB__ = db;
}

