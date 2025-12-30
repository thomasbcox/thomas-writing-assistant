import type { LLMClient } from "~/server/services/llm/client";

// Re-export LLMClient type for convenience in tests
export type { LLMClient };

// Define a type that matches the public interface of LLMClient
export interface LLMClientInterface {
  completeJSON(prompt: string, systemPrompt?: string): Promise<Record<string, unknown>>;
  complete(prompt: string, systemPrompt?: string, maxTokens?: number, temperature?: number): Promise<string>;
  getProvider(): "openai" | "gemini";
  getModel(): string;
  getTemperature(): number;
  setProvider(provider: "openai" | "gemini"): void;
  setModel(model: string): void;
  setTemperature(temperature: number): void;
}

/**
 * Mock LLM Client for testing
 * Allows setting mock responses for completeJSON and complete methods
 * 
 * Use `as ActualLLMClient` when passing to functions that expect LLMClient
 */
export class MockLLMClient implements LLMClientInterface {
  private mockCompleteJSON?: (
    prompt: string,
    systemPrompt?: string,
  ) => Promise<Record<string, unknown>>;
  private mockComplete?: (
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number,
  ) => Promise<string>;
  private mockProvider: "openai" | "gemini" = "openai";
  private mockModel: string = "gpt-4o-mini";
  private mockTemperature: number = 0.7;

  setMockCompleteJSON(
    fn: (prompt: string, systemPrompt?: string) => Promise<Record<string, unknown>>,
  ) {
    this.mockCompleteJSON = fn;
  }

  setMockComplete(
    fn: (
      prompt: string,
      systemPrompt?: string,
      maxTokens?: number,
      temperature?: number,
    ) => Promise<string>,
  ) {
    this.mockComplete = fn;
  }

  setProvider(provider: "openai" | "gemini") {
    this.mockProvider = provider;
  }

  setModel(model: string) {
    this.mockModel = model;
  }

  setTemperature(temperature: number) {
    this.mockTemperature = temperature;
  }

  async completeJSON(
    prompt: string,
    systemPrompt?: string,
  ): Promise<Record<string, unknown>> {
    if (this.mockCompleteJSON) {
      return this.mockCompleteJSON(prompt, systemPrompt);
    }
    // Default mock response
    return { concepts: [] };
  }

  async complete(
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number,
  ): Promise<string> {
    if (this.mockComplete) {
      return this.mockComplete(prompt, systemPrompt, maxTokens, temperature);
    }
    return "";
  }

  getProvider(): "openai" | "gemini" {
    return this.mockProvider;
  }

  getModel(): string {
    return this.mockModel;
  }

  getTemperature(): number {
    return this.mockTemperature;
  }

  /**
   * Cast this mock to LLMClient type for use in functions that expect LLMClient
   * This is safe because we implement all the public methods that are used
   */
  asLLMClient(): LLMClient {
    return this as unknown as LLMClient;
  }
}

/**
 * Helper function to create a MockLLMClient that's typed as LLMClient
 * Use this when you need to pass a mock to a function expecting LLMClient
 */
export function createMockLLMClient(): MockLLMClient & { asLLMClient(): LLMClient } {
  return new MockLLMClient();
}

