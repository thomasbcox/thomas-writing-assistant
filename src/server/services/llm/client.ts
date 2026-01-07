import { env } from "~/env";
import { ILLMProvider, LLMProvider, LLMConfig, type ConversationMessage } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";
import { getCachedResponse, storeCachedResponse } from "./semanticCache";
import { getCurrentDb } from "~/server/db";
import type { DatabaseInstance } from "~/server/db";

/**
 * Unified LLM Client that supports multiple providers
 */
export class LLMClient {
  private provider: ILLMProvider;
  private providerType: LLMProvider;
  private model: string;
  private temperature: number;

  constructor(config?: Partial<LLMConfig>) {
    const provider = config?.provider ?? this.getDefaultProvider();
    const model = config?.model ?? this.getDefaultModel(provider);
    const temperature = config?.temperature ?? 0.7;

    this.providerType = provider;
    this.model = model;
    this.temperature = temperature;

    // Initialize the appropriate provider
    if (provider === "gemini") {
      if (!env.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY environment variable not set. Set it to use Gemini.");
      }
      this.provider = new GeminiProvider(env.GOOGLE_API_KEY, model, temperature);
    } else {
      // Default to OpenAI
      if (!env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY environment variable not set. Set it to use OpenAI.");
      }
      this.provider = new OpenAIProvider(env.OPENAI_API_KEY, model, temperature);
    }
  }

  /**
   * Determine default provider based on available API keys
   */
  private getDefaultProvider(): LLMProvider {
    // Prefer Gemini if available, fallback to OpenAI
    if (env.GOOGLE_API_KEY) {
      return "gemini";
    }
    if (env.OPENAI_API_KEY) {
      return "openai";
    }
    throw new Error("No LLM provider API keys found. Set OPENAI_API_KEY or GOOGLE_API_KEY.");
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: LLMProvider): string {
    if (provider === "gemini") {
      // Use gemini-3-pro-preview as default (most recent, capable - user is licensed)
      // This is the correct API identifier per Google's documentation
      return "gemini-3-pro-preview";
    }
    return "gpt-4o-mini";
  }

  setModel(model: string) {
    this.model = model;
    if (this.provider instanceof OpenAIProvider || this.provider instanceof GeminiProvider) {
      this.provider.setModel(model);
    }
  }

  setTemperature(temperature: number) {
    this.temperature = temperature;
    if (this.provider instanceof OpenAIProvider || this.provider instanceof GeminiProvider) {
      this.provider.setTemperature(temperature);
    }
  }

  setProvider(provider: LLMProvider) {
    if (provider === this.providerType) {
      return; // Already using this provider
    }

    this.providerType = provider;
    const model = this.getDefaultModel(provider);

    if (provider === "gemini") {
      if (!env.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY environment variable not set");
      }
      this.provider = new GeminiProvider(env.GOOGLE_API_KEY, model, this.temperature);
    } else {
      if (!env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY environment variable not set");
      }
      this.provider = new OpenAIProvider(env.OPENAI_API_KEY, model, this.temperature);
    }
  }

  getProvider(): LLMProvider {
    return this.providerType;
  }

  getModel(): string {
    return this.model;
  }

  getTemperature(): number {
    return this.temperature;
  }

  async complete(
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number,
    conversationHistory?: ConversationMessage[],
    db?: DatabaseInstance,
    useCache: boolean = true,
  ): Promise<string> {
    // Check semantic cache if enabled and database provided
    if (useCache && db) {
      const cacheKey = `${systemPrompt || ""}\n${prompt}`;
      const cached = await getCachedResponse(
        db,
        cacheKey,
        this.providerType,
        this.model,
      );
      if (cached && typeof cached.response === "string") {
        return cached.response;
      }
    }

    const response = await this.provider.complete(
      prompt,
      systemPrompt,
      maxTokens,
      temperature,
      conversationHistory,
    );

    // Store in cache if enabled and database provided
    if (useCache && db) {
      const cacheKey = `${systemPrompt || ""}\n${prompt}`;
      await storeCachedResponse(
        db,
        cacheKey,
        { response },
        this.providerType,
        this.model,
      );
    }

    return response;
  }

  async completeJSON(
    prompt: string,
    systemPrompt?: string,
    conversationHistory?: ConversationMessage[],
    db?: DatabaseInstance,
    useCache: boolean = true,
  ): Promise<Record<string, unknown>> {
    // Check semantic cache if enabled and database provided
    if (useCache && db) {
      const cacheKey = `${systemPrompt || ""}\n${prompt}`;
      const cached = await getCachedResponse(
        db,
        cacheKey,
        this.providerType,
        this.model,
      );
      if (cached) {
        return cached;
      }
    }

    const response = await this.provider.completeJSON(
      prompt,
      systemPrompt,
      conversationHistory,
    );

    // Store in cache if enabled and database provided
    if (useCache && db) {
      const cacheKey = `${systemPrompt || ""}\n${prompt}`;
      await storeCachedResponse(
        db,
        cacheKey,
        response,
        this.providerType,
        this.model,
      );
    }

    return response;
  }

  async embed(text: string): Promise<number[]> {
    return this.provider.embed(text);
  }
}

// Singleton instance
let llmClientInstance: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClientInstance) {
    llmClientInstance = new LLMClient();
  }
  return llmClientInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetLLMClient() {
  llmClientInstance = null;
}

