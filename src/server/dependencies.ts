/**
 * Dependency Injection Container
 * 
 * Centralized dependency management for the application.
 * Allows services to be injected for testing while maintaining
 * backward compatibility with singleton pattern.
 */

import type { LLMClient } from "./services/llm/client";
import type { ConfigLoader } from "./services/config";
import type { DatabaseInstance } from "./db";

// Import singletons for default creation
import { getLLMClient } from "./services/llm/client";
import { getConfigLoader } from "./services/config";
import { db } from "./db";

export interface AppDependencies {
  llmClient: LLMClient;
  configLoader: ConfigLoader;
  db: DatabaseInstance;
}

export interface ServiceContext {
  db: DatabaseInstance;
  llm: LLMClient;
  config: ConfigLoader;
}

let dependencies: AppDependencies | null = null;

/**
 * Get application dependencies (singleton pattern for production)
 * In tests, use setDependencies() to inject mocks
 */
export function getDependencies(): AppDependencies {
  if (!dependencies) {
    dependencies = createProductionDependencies();
  }
  return dependencies;
}

/**
 * Create production dependencies (uses real singletons)
 */
function createProductionDependencies(): AppDependencies {
  return {
    llmClient: getLLMClient(),
    configLoader: getConfigLoader(),
    db,
  };
}

/**
 * Set dependencies (primarily for testing)
 * Allows injecting mock dependencies
 */
export function setDependencies(deps: AppDependencies): void {
  dependencies = deps;
}

/**
 * Reset dependencies to null (useful for testing)
 * Next call to getDependencies() will create fresh production dependencies
 */
export function resetDependencies(): void {
  dependencies = null;
}

/**
 * Get a specific dependency by key
 * Useful for extracting individual dependencies
 */
export function getDependency<K extends keyof AppDependencies>(
  key: K
): AppDependencies[K] {
  return getDependencies()[key];
}
