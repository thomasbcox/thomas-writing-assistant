/**
 * Test Dependency Factory
 * 
 * Creates mock dependencies for testing.
 * Allows tests to inject mocks while maintaining type safety.
 */

import type { AppDependencies } from "~/server/dependencies";
import type { LLMClient } from "~/server/services/llm/client";
import type { ConfigLoader } from "~/server/services/config";
import type { DatabaseInstance } from "~/server/db";
import { createTestDb, migrateTestDb } from "./db";
import { createMockLLMClient } from "../mocks/llm-client";
import { MockConfigLoader } from "../mocks/config-loader";

/**
 * Create mock LLM client for testing
 * 
 * @param overrides - Partial overrides for the mock LLM client
 * @returns A mock LLM client that can be used as LLMClient
 * 
 * @example
 * ```typescript
 * const mockLLM = createMockLLMClient();
 * mockLLM.setMockCompleteJSON(async () => ({ concepts: [...] }));
 * ```
 */
export function createMockLLMClientForDeps(overrides?: Partial<LLMClient>): LLMClient {
  const mockClient = createMockLLMClient();
  return mockClient.asLLMClient();
}

/**
 * Create mock config loader for testing
 * 
 * @param overrides - Partial overrides for the mock config loader
 * @returns A mock config loader that implements ConfigLoader
 * 
 * @example
 * ```typescript
 * const mockConfig = createMockConfigLoaderForDeps();
 * mockConfig.setMockSystemPrompt("Custom prompt");
 * ```
 */
export function createMockConfigLoaderForDeps(overrides?: Partial<ConfigLoader>): ConfigLoader {
  const mockLoader = new MockConfigLoader();
  return mockLoader as unknown as ConfigLoader;
}

/**
 * Create test dependencies with optional overrides
 * Returns a complete AppDependencies object with test mocks
 * 
 * @param overrides - Partial overrides for specific dependencies
 * @returns Complete AppDependencies object ready for testing
 * 
 * @example
 * ```typescript
 * // Use default mocks
 * const deps = await createTestDependencies();
 * 
 * // Override specific dependency
 * const deps = await createTestDependencies({
 *   llmClient: customLLMClient,
 * });
 * ```
 */
export async function createTestDependencies(
  overrides?: Partial<AppDependencies>
): Promise<AppDependencies> {
  // Create test database
  const testDb = createTestDb();
  await migrateTestDb(testDb);

  return {
    llmClient: overrides?.llmClient ?? createMockLLMClientForDeps(),
    configLoader: overrides?.configLoader ?? createMockConfigLoaderForDeps(),
    db: overrides?.db ?? testDb,
  };
}

/**
 * Synchronous version that accepts a pre-created database
 * Use this when you already have a test database instance
 * 
 * @param testDb - Pre-created test database instance
 * @param overrides - Partial overrides for specific dependencies
 * @returns Complete AppDependencies object ready for testing
 * 
 * @example
 * ```typescript
 * const testDb = createTestDb();
 * await migrateTestDb(testDb);
 * const deps = createTestDependenciesSync(testDb);
 * ```
 */
export function createTestDependenciesSync(
  testDb: DatabaseInstance,
  overrides?: Partial<AppDependencies>
): AppDependencies {
  return {
    llmClient: overrides?.llmClient ?? createMockLLMClientForDeps(),
    configLoader: overrides?.configLoader ?? createMockConfigLoaderForDeps(),
    db: overrides?.db ?? testDb,
  };
}

