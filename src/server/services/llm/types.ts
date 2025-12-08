/**
 * Provider-agnostic LLM interface
 */
export interface ILLMProvider {
  complete(
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number,
  ): Promise<string>;

  completeJSON(
    prompt: string,
    systemPrompt?: string,
  ): Promise<Record<string, unknown>>;
}

export type LLMProvider = "openai" | "gemini";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
}

