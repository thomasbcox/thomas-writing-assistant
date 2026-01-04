import type { ConfigLoader } from "~/server/services/config";
import type { StyleGuide, Credo, Constraints } from "~/server/services/config";

// Re-export ConfigLoader type for convenience in tests
export type { ConfigLoader };

// Define an interface for the public methods we need to mock
interface ConfigLoaderInterface {
  getSystemPrompt(context?: string): string;
  getStyleGuide(): StyleGuide;
  getCredo(): Credo;
  getConstraints(): Constraints;
  reloadConfigs?(): void;
}

/**
 * Mock Config Loader for testing
 * Allows setting mock config values
 */
export class MockConfigLoader implements ConfigLoaderInterface {
  private mockSystemPrompt?: string;
  private mockStyleGuide: StyleGuide = {};
  private mockCredo: Credo = {};
  private mockConstraints: Constraints = {};

  setMockSystemPrompt(prompt: string) {
    this.mockSystemPrompt = prompt;
  }

  setMockStyleGuide(styleGuide: StyleGuide) {
    this.mockStyleGuide = styleGuide;
  }

  setMockCredo(credo: Credo) {
    this.mockCredo = credo;
  }

  setMockConstraints(constraints: Constraints) {
    this.mockConstraints = constraints;
  }

  getSystemPrompt(context?: string): string {
    if (this.mockSystemPrompt) {
      return context ? `${this.mockSystemPrompt}\n\nContext: ${context}` : this.mockSystemPrompt;
    }
    return `Mock system prompt${context ? `: ${context}` : ""}`;
  }

  getStyleGuide(): StyleGuide {
    return this.mockStyleGuide;
  }

  getCredo(): Credo {
    return this.mockCredo;
  }

  getConstraints(): Constraints {
    return this.mockConstraints;
  }

  reloadConfigs(): void {
    // No-op for mock
  }

  private validateShouldThrow = false;
  private validateErrorMessage?: string;

  setMockValidateConfigForContentGeneration(fn: () => void) {
    // Allow tests to set a function that throws
    try {
      fn();
      this.validateShouldThrow = false;
      this.validateErrorMessage = undefined;
    } catch (error) {
      this.validateShouldThrow = true;
      this.validateErrorMessage = (error as Error).message;
    }
  }

  validateConfigForContentGeneration(): void {
    if (this.validateShouldThrow && this.validateErrorMessage) {
      throw new Error(this.validateErrorMessage);
    }
    // No-op for mock - tests don't need strict config validation
    // In real usage, this would throw if config files failed to load
  }

  getPrompt(key: string, defaultValue?: string): string {
    // Mock prompt getter - return default or a mock prompt
    return defaultValue || `Mock prompt for ${key}`;
  }

  getConfigStatus(): {
    styleGuide: { loaded: boolean; isEmpty: boolean; error?: string };
    credo: { loaded: boolean; isEmpty: boolean; error?: string };
    constraints: { loaded: boolean; isEmpty: boolean; error?: string };
  } {
    return {
      styleGuide: { loaded: true, isEmpty: Object.keys(this.mockStyleGuide).length === 0 },
      credo: { loaded: true, isEmpty: Object.keys(this.mockCredo).length === 0 },
      constraints: { loaded: true, isEmpty: Object.keys(this.mockConstraints).length === 0 },
    };
  }
}

