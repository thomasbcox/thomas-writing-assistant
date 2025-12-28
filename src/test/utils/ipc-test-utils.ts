/**
 * Test utilities for IPC handlers
 * Provides helpers for testing IPC handlers in isolation
 */

import { ipcMain } from "electron";
import { createTestDb, migrateTestDb } from "../test-utils";
import type { ReturnType } from "~/server/db";

type Database = ReturnType<typeof import("~/server/db").db>;

/**
 * Setup IPC handler testing environment
 * Creates test database and mocks getDb() from main process
 */
export async function setupIPCTest() {
  const testDb = createTestDb();
  await migrateTestDb(testDb);

  // Mock getDb from electron/main
  jest.mock("../../electron/main", () => ({
    getDb: () => testDb,
  }));

  return {
    db: testDb,
    cleanup: async () => {
      // Cleanup handled by test-utils
    },
  };
}

/**
 * Create a mock IPC event object
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
 * Test an IPC handler directly
 */
export async function testIpcHandler<TInput, TOutput>(
  channel: string,
  input: TInput,
  expectedOutput?: TOutput,
) {
  const event = createMockIpcEvent();
  
  // Get the handler
  const handlers = ipcMain.listeners(channel);
  if (handlers.length === 0) {
    throw new Error(`No handler registered for channel: ${channel}`);
  }

  const handler = handlers[0] as (event: any, ...args: any[]) => Promise<any>;
  const result = await handler(event, input);

  if (expectedOutput !== undefined) {
    expect(result).toEqual(expectedOutput);
  }

  return result;
}

/**
 * Register IPC handlers for testing
 * This allows handlers to be tested in isolation
 */
export async function registerHandlersForTesting() {
  // Import and register handlers
  const { registerAllHandlers } = await import("../../../electron/ipc-handlers/index");
  registerAllHandlers();
}

