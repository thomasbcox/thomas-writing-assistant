/**
 * Mock LLM Client for testing
 * Implements the full ILLMProvider interface including embeddings
 */

import { jest } from "@jest/globals";
import type { ILLMProvider, LLMProvider } from "~/server/services/llm/types";
import type { LLMClient } from "~/server/services/llm/client";

// Re-export LLMClient type for convenience in tests
export type { LLMClient };

/**
 * Mock LLM Client that implements the full ILLMProvider interface
 * Supports configurable responses for all methods including embeddings
 */
export class MockLLMClient implements ILLMProvider {
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
  private mockEmbed?: (text: string) => Promise<number[]>;
  private mockProvider: LLMProvider = "openai";
  private mockModel: string = "gpt-4o-mini";
  private mockTemperature: number = 0.7;
  private shouldError: boolean = false;
  private errorMessage?: string;

  /**
   * Set a custom mock function for completeJSON
   */
  setMockCompleteJSON(
    fn: (prompt: string, systemPrompt?: string) => Promise<Record<string, unknown>>,
  ) {
    this.mockCompleteJSON = fn;
  }

  /**
   * Set a custom mock function for complete
   */
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

  /**
   * Set a custom mock function for embed
   */
  setMockEmbed(fn: (text: string) => Promise<number[]>) {
    this.mockEmbed = fn;
  }

  /**
   * Set the provider type (for getProvider() method)
   */
  setProvider(provider: LLMProvider) {
    this.mockProvider = provider;
  }

  /**
   * Set the model (for getModel() method)
   */
  setModel(model: string) {
    this.mockModel = model;
  }

  /**
   * Set the temperature (for getTemperature() method)
   */
  setTemperature(temperature: number) {
    this.mockTemperature = temperature;
  }

  /**
   * Configure the mock to throw an error on next call
   */
  setShouldError(shouldError: boolean, message?: string) {
    this.shouldError = shouldError;
    this.errorMessage = message;
  }

  /**
   * Reset all mocks to default state
   */
  reset() {
    this.mockCompleteJSON = undefined;
    this.mockComplete = undefined;
    this.mockEmbed = undefined;
    this.shouldError = false;
    this.errorMessage = undefined;
  }

  /**
   * Generate a deterministic embedding vector based on text
   * Uses a simple hash-based approach to ensure same text = same vector
   */
  private generateDeterministicEmbedding(text: string): number[] {
    // Simple hash function to generate deterministic values
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate a 1536-dimensional vector (OpenAI text-embedding-3-small size)
    // Use hash to seed pseudo-random values
    const vector: number[] = [];
    for (let i = 0; i < 1536; i++) {
      // Use hash + i to generate deterministic but varied values
      const seed = (hash + i) % 1000;
      // Normalize to range [-1, 1] for cosine similarity
      const value = (seed / 500) - 1;
      vector.push(value);
    }
    return vector;
  }

  async completeJSON(
    prompt: string,
    systemPrompt?: string,
  ): Promise<Record<string, unknown>> {
    if (this.shouldError) {
      throw new Error(this.errorMessage || "Mock LLM error");
    }

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
    if (this.shouldError) {
      throw new Error(this.errorMessage || "Mock LLM error");
    }

    if (this.mockComplete) {
      return this.mockComplete(prompt, systemPrompt, maxTokens, temperature);
    }

    // Default mock response
    return "Mock LLM response";
  }

  async embed(text: string): Promise<number[]> {
    if (this.shouldError) {
      throw new Error(this.errorMessage || "Mock LLM error");
    }

    if (this.mockEmbed) {
      return this.mockEmbed(text);
    }

    // Default: return deterministic embedding based on text
    return this.generateDeterministicEmbedding(text);
  }

  getProvider(): LLMProvider {
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
 * 
 * @example
 * ```typescript
 * const mockClient = createMockLLMClient();
 * mockClient.setMockCompleteJSON(async () => ({ concepts: [...] }));
 * const result = await someFunction(mockClient.asLLMClient());
 * ```
 */
export function createMockLLMClient(): MockLLMClient {
  return new MockLLMClient();
}

