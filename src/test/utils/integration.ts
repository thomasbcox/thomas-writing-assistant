/**
 * Integration test utilities
 * Provides helpers for testing the full stack (IPC + services + database)
 */

import { jest } from "@jest/globals";
import { createTestDb, migrateTestDb } from "./db";
import { setupIPCTest, registerHandlersForTesting } from "./ipc";
import { createTestDependencies } from "./dependencies";
import type { DatabaseInstance } from "~/server/db";
import type { AppDependencies } from "~/server/dependencies";

/**
 * Setup a complete integration test environment
 * Creates test database, registers IPC handlers, and sets up mocks
 * 
 * @returns Object with test database, dependencies, and cleanup function
 * 
 * @example
 * ```typescript
 * describe("Integration Test", () => {
 *   let setup: Awaited<ReturnType<typeof setupIntegrationTest>>;
 *   
 *   beforeEach(async () => {
 *     setup = await setupIntegrationTest();
 *   });
 *   
 *   afterEach(async () => {
 *     await setup.cleanup();
 *   });
 * });
 * ```
 */
export async function setupIntegrationTest(): Promise<{
  db: DatabaseInstance;
  dependencies: AppDependencies;
  cleanup: () => Promise<void>;
}> {
  // Setup IPC test environment (creates DB and mocks getDb)
  const ipcSetup = await setupIPCTest();
  
  // Register all IPC handlers
  await registerHandlersForTesting();
  
  // Create test dependencies
  const dependencies = await createTestDependencies({
    db: ipcSetup.db,
  });

  return {
    db: ipcSetup.db,
    dependencies,
    cleanup: async () => {
      await ipcSetup.cleanup();
    },
  };
}

/**
 * Create a test Electron app instance (minimal)
 * Useful for integration tests that need app context
 * 
 * @returns Mock Electron app object
 * 
 * @example
 * ```typescript
 * const app = createTestApp();
 * // Use app for tests that need Electron app context
 * ```
 */
export function createTestApp() {
  return {
    getPath: (name: string) => {
      if (name === "userData") {
        return "/tmp/test-user-data";
      }
      return "/tmp";
    },
    on: jest.fn(),
    quit: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
  };
}

