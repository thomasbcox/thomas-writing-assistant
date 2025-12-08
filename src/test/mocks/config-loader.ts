import type { ConfigLoader } from "~/server/services/config";
import type { StyleGuide, Credo, Constraints } from "~/server/services/config";

/**
 * Mock Config Loader for testing
 * Allows setting mock config values
 */
export class MockConfigLoader implements Partial<ConfigLoader> {
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
}

