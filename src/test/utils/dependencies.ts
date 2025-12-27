/**
 * Test Dependency Factory
 * 
 * Creates mock dependencies for testing.
 * Allows tests to inject mocks while maintaining type safety.
 */

import { jest } from "@jest/globals";
import type { AppDependencies } from "~/server/dependencies";
import type { LLMClient } from "~/server/services/llm/client";
import type { ConfigLoader } from "~/server/services/config";
import type { ReturnType } from "~/server/db";

/**
 * Create mock LLM client for testing
 */
export function createMockLLMClient(overrides?: Partial<LLMClient>): LLMClient {
  return {
    complete: jest.fn().mockResolvedValue("mock response"),
    completeJSON: jest.fn().mockResolvedValue({}),
    getProvider: jest.fn().mockReturnValue("openai"),
    getModel: jest.fn().mockReturnValue("gpt-4o-mini"),
    getTemperature: jest.fn().mockReturnValue(0.7),
    setProvider: jest.fn(),
    setModel: jest.fn(),
    setTemperature: jest.fn(),
    ...overrides,
  } as unknown as LLMClient;
}

/**
 * Create mock config loader for testing
 */
export function createMockConfigLoader(overrides?: Partial<ConfigLoader>): ConfigLoader {
  return {
    getStyleGuide: jest.fn().mockReturnValue({}),
    getCredo: jest.fn().mockReturnValue({}),
    getConstraints: jest.fn().mockReturnValue({}),
    getSystemPrompt: jest.fn((basePrompt?: string) => basePrompt || "mock system prompt"),
    getConfigStatus: jest.fn().mockReturnValue({
      styleGuide: { loaded: true, isEmpty: false },
      credo: { loaded: true, isEmpty: false },
      constraints: { loaded: true, isEmpty: false },
    }),
    reloadConfigs: jest.fn(),
    ...overrides,
  } as unknown as ConfigLoader;
}

/**
 * Create test dependencies with optional overrides
 * Note: This function should be called from test files, not at module level
 * to avoid ESM import issues
 */
export async function createTestDependencies(
  overrides?: Partial<AppDependencies>
): Promise<AppDependencies> {
  // Import createTestDb from test-utils using dynamic import for ESM
  const { createTestDb } = await import("../test-utils");
  const testDb = createTestDb();

  return {
    llmClient: overrides?.llmClient ?? createMockLLMClient(),
    configLoader: overrides?.configLoader ?? createMockConfigLoader(),
    db: overrides?.db ?? testDb,
  };
}

/**
 * Synchronous version that accepts a pre-created database
 * Use this when you already have a test database instance
 */
export function createTestDependenciesSync(
  testDb: ReturnType<typeof import("../test-utils").createTestDb>,
  overrides?: Partial<AppDependencies>
): AppDependencies {
  return {
    llmClient: overrides?.llmClient ?? createMockLLMClient(),
    configLoader: overrides?.configLoader ?? createMockConfigLoader(),
    db: overrides?.db ?? testDb,
  };
}
