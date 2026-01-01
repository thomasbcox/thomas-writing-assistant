import { env } from "~/env";
import { ILLMProvider, LLMProvider, LLMConfig } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";

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
  ): Promise<string> {
    return this.provider.complete(prompt, systemPrompt, maxTokens, temperature);
  }

  async completeJSON(
    prompt: string,
    systemPrompt?: string,
  ): Promise<Record<string, unknown>> {
    return this.provider.completeJSON(prompt, systemPrompt);
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

