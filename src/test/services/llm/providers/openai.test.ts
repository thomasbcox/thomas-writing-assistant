/**
 * Tests for OpenAI Provider
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { OpenAIProvider } from "~/server/services/llm/providers/openai";

// Mock OpenAI
const mockChatCompletionsCreate = jest.fn();
const mockEmbeddingsCreate = jest.fn();
const mockChat = {
  completions: {
    create: mockChatCompletionsCreate,
  },
};
const mockEmbeddings = {
  create: mockEmbeddingsCreate,
};

const MockOpenAI = jest.fn().mockImplementation(() => ({
  chat: mockChat,
  embeddings: mockEmbeddings,
}));

jest.mock("openai", () => ({
  default: MockOpenAI,
}));

describe("OpenAIProvider", () => {
  const apiKey = "test-api-key";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with API key and default model", () => {
      const provider = new OpenAIProvider(apiKey);
      expect(provider).toBeDefined();
      expect(MockOpenAI).toHaveBeenCalledWith({ apiKey });
    });

    it("should initialize with custom model", () => {
      const provider = new OpenAIProvider(apiKey, "gpt-4o");
      expect(provider).toBeDefined();
    });

    it("should initialize with custom temperature", () => {
      const provider = new OpenAIProvider(apiKey, "gpt-4o-mini", 0.5);
      expect(provider).toBeDefined();
    });

    it("should throw error when API key is missing", () => {
      expect(() => new OpenAIProvider("")).toThrow("OPENAI_API_KEY environment variable not set");
    });
  });

  describe("complete", () => {
    it("should return text from chat completion", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: "Generated text",
            },
          },
        ],
      });

      const result = await provider.complete("Prompt", "System prompt");
      expect(result).toBe("Generated text");
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "System prompt" },
            { role: "user", content: "Prompt" },
          ],
        }),
      );
    });

    it("should work without system prompt", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any).mockResolvedValue({
        choices: [{ message: { content: "Text" } }],
      });

      await provider.complete("Prompt");
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "Prompt" }],
        }),
      );
    });

    it("should use custom maxTokens and temperature", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any).mockResolvedValue({
        choices: [{ message: { content: "Text" } }],
      });

      await provider.complete("Prompt", undefined, 100, 0.5);
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 100,
          temperature: 0.5,
        }),
      );
    });

    it("should handle empty response", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any).mockResolvedValue({
        choices: [{ message: {} }],
      } as any);

      const result = await provider.complete("Prompt");
      expect(result).toBe("");
    });

    it("should handle API errors", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any).mockRejectedValue(new Error("API error"));

      await expect(provider.complete("Prompt")).rejects.toThrow("API error");
    });
  });

  describe("completeJSON", () => {
    it("should return parsed JSON object", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ key: "value", nested: { data: 123 } }),
            },
          },
        ],
      } as any);

      const result = await provider.completeJSON("Prompt", "System prompt");
      expect(result).toEqual({ key: "value", nested: { data: 123 } });
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: "json_object" },
        }),
      );
    });

    it("should retry on invalid JSON", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any)
        .mockResolvedValueOnce({
          choices: [{ message: { content: "not json" } }],
        } as any)
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ key: "value" }) } }],
        } as any);

      const result = await provider.completeJSON("Prompt", undefined, 3);
      expect(result).toEqual({ key: "value" });
      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(2);
    });

    it("should throw error when response is not an object", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(["array", "not", "object"]) } }],
      });

      await expect(provider.completeJSON("Prompt", undefined, 1)).rejects.toThrow(
        "Response is not a JSON object",
      );
    });

    it("should throw error when max retries exceeded", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any).mockResolvedValue({
        choices: [{ message: { content: "not json" } }],
      });

      await expect(provider.completeJSON("Prompt", undefined, 2)).rejects.toThrow(
        "Failed to parse JSON response",
      );
    });

    it("should handle null response", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(null) } }],
      } as any);

      await expect(provider.completeJSON("Prompt", undefined, 1)).rejects.toThrow(
        "Response is not a JSON object",
      );
    });

    it("should handle API errors during retry", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockChatCompletionsCreate as any)
        .mockResolvedValueOnce({
          choices: [{ message: { content: "not json" } }],
        })
        .mockRejectedValueOnce(new Error("API error"));

      await expect(provider.completeJSON("Prompt", undefined, 3)).rejects.toThrow("API error");
    });
  });

  describe("embed", () => {
    it("should return embedding array", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockEmbeddingsCreate as any).mockResolvedValue({
        data: [
          {
            embedding: Array(1536).fill(0.1),
          },
        ],
      });

      const result = await provider.embed("Text to embed");
      expect(result).toHaveLength(1536);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: "Text to embed",
      });
    });

    it("should handle embedding API errors", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockEmbeddingsCreate as any).mockRejectedValue(new Error("API error"));

      await expect(provider.embed("Text")).rejects.toThrow("API error");
    });

    it("should handle empty embedding response", async () => {
      const provider = new OpenAIProvider(apiKey);
      (mockEmbeddingsCreate as any).mockResolvedValue({
        data: [],
      });

      await expect(provider.embed("Text")).rejects.toThrow();
    });
  });

  describe("setModel and setTemperature", () => {
    it("should update model", () => {
      const provider = new OpenAIProvider(apiKey);
      provider.setModel("gpt-4o");
      // Model is used in next API call
      expect(provider).toBeDefined();
    });

    it("should update temperature", () => {
      const provider = new OpenAIProvider(apiKey);
      provider.setTemperature(0.5);
      // Temperature is used in next API call
      expect(provider).toBeDefined();
    });
  });
});

