import OpenAI from "openai";
import { ILLMProvider } from "../types";

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor(apiKey: string, model: string = "gpt-4o-mini", temperature: number = 0.7) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }

    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.temperature = temperature;
  }

  setModel(model: string) {
    this.model = model;
  }

  setTemperature(temperature: number) {
    this.temperature = temperature;
  }

  async complete(
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number,
  ): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: temperature ?? this.temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async completeJSON(
    prompt: string,
    systemPrompt?: string,
    maxRetries: number = 3,
  ): Promise<Record<string, unknown>> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          temperature: this.temperature,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content ?? "{}";
        
        // Try to parse JSON
        try {
          const parsed = JSON.parse(content) as Record<string, unknown>;
          
          // Validate it's actually an object (not null, array, etc.)
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            throw new Error(`Response is not a JSON object: ${typeof parsed}`);
          }
          
          return parsed;
        } catch (parseError) {
          const parseErr = parseError instanceof Error ? parseError : new Error(String(parseError));
          
          // If this is the last attempt, throw the error
          if (attempt === maxRetries - 1) {
            throw new Error(
              `Failed to parse JSON response after ${maxRetries} attempts. ` +
              `Last error: ${parseErr.message}. ` +
              `Response preview: ${content.slice(0, 200)}`
            );
          }
          
          // Log and retry
          console.warn(
            `[OpenAI] JSON parse failed (attempt ${attempt + 1}/${maxRetries}): ${parseErr.message}. Retrying...`
          );
          lastError = parseErr;
          
          // Exponential backoff: wait 1s, 2s, 4s
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        
        // If it's a non-retryable error (not JSON parsing), throw immediately
        if (!err.message.includes("parse") && !err.message.includes("JSON")) {
          throw err;
        }
        
        // If this is the last attempt, throw
        if (attempt === maxRetries - 1) {
          throw new Error(
            `Failed to get valid JSON response after ${maxRetries} attempts. ` +
            `Last error: ${err.message}`
          );
        }
        
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error(
      `Failed to get valid JSON response after ${maxRetries} attempts. ` +
      `Last error: ${lastError?.message ?? "Unknown error"}`
    );
  }

  getModel(): string {
    return this.model;
  }

  getTemperature(): number {
    return this.temperature;
  }
}

