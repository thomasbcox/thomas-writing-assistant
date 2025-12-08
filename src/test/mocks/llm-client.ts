import type { LLMClient } from "~/server/services/llm/client";

/**
 * Mock LLM Client for testing
 * Allows setting mock responses for completeJSON and complete methods
 */
export class MockLLMClient implements Partial<LLMClient> {
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
}

