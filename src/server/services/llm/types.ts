/**
 * Message for conversation history
 */
export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Provider-agnostic LLM interface
 */
export interface ILLMProvider {
  complete(
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number,
    conversationHistory?: ConversationMessage[],
  ): Promise<string>;

  completeJSON(
    prompt: string,
    systemPrompt?: string,
    conversationHistory?: ConversationMessage[],
  ): Promise<Record<string, unknown>>;

  /**
   * Generate embeddings for the given text
   * @param text The text to embed
   * @returns A vector of floating-point numbers representing the text embedding
   */
  embed(text: string): Promise<number[]>;
}

export type LLMProvider = "openai" | "gemini";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
}

