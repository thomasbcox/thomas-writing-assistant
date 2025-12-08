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
  ): Promise<Record<string, unknown>> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: this.temperature,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getModel(): string {
    return this.model;
  }

  getTemperature(): number {
    return this.temperature;
  }
}

