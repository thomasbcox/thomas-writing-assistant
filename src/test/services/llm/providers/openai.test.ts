/**
 * Tests for OpenAIProvider
 * Uses manual mocks from __mocks__/openai.ts
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { OpenAIProvider } from "~/server/services/llm/providers/openai";
import {
  mockChatCompletionsCreate,
  mockEmbeddingsCreate,
  _resetMocks,
  _setDefaultSuccess,
} from "../../../__mocks__/openai";

// Use manual mock from __mocks__ (configured via moduleNameMapper in jest.config.js)
jest.mock("openai", () => {
  return jest.requireActual("../../../__mocks__/openai");
});

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    jest.useFakeTimers(); // Use fake timers to speed up exponential backoff
    _resetMocks();
    _setDefaultSuccess();
    provider = new OpenAIProvider("test-api-key");
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers after each test
  });

  describe("constructor", () => {
    it("should throw error if apiKey is missing", () => {
      expect(() => new OpenAIProvider("")).toThrow("OPENAI_API_KEY environment variable not set");
    });

    it("should initialize with default model and temperature", () => {
      const p = new OpenAIProvider("test-key");
      expect(p.getModel()).toBe("gpt-4o-mini");
      expect(p.getTemperature()).toBe(0.7);
    });

    it("should initialize with custom model and temperature", () => {
      const p = new OpenAIProvider("test-key", "gpt-4o", 0.9);
      expect(p.getModel()).toBe("gpt-4o");
      expect(p.getTemperature()).toBe(0.9);
    });
  });

  describe("setModel", () => {
    it("should update the model", () => {
      provider.setModel("gpt-4-turbo");
      expect(provider.getModel()).toBe("gpt-4-turbo");
    });
  });

  describe("setTemperature", () => {
    it("should update the temperature", () => {
      provider.setTemperature(0.9);
      expect(provider.getTemperature()).toBe(0.9);
    });
  });

  describe("complete()", () => {
    it("should format messages correctly with system prompt", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: "Response" } }],
      });

      await provider.complete("user prompt", "system prompt");

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "system prompt" },
            { role: "user", content: "user prompt" },
          ],
        })
      );
    });

    it("should format messages correctly without system prompt", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: "Response" } }],
      });

      await provider.complete("user prompt");

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "user prompt" }],
        })
      );
    });

    it("should use custom temperature when provided", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: "Response" } }],
      });

      await provider.complete("test", undefined, undefined, 0.9);

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
        })
      );
    });

    it("should use default temperature when not provided", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: "Response" } }],
      });

      await provider.complete("test");

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      );
    });

    it("should use maxTokens when provided", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: "Response" } }],
      });

      await provider.complete("test", undefined, 100);

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 100,
        })
      );
    });

    it("should return response content", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: "Test response" } }],
      });

      const result = await provider.complete("test");

      expect(result).toBe("Test response");
    });

    it("should handle empty response", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await provider.complete("test");

      expect(result).toBe("");
    });

    it("should handle missing choices", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [],
      });

      const result = await provider.complete("test");

      expect(result).toBe("");
    });
  });

  describe("completeJSON()", () => {
    it("should parse valid JSON", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '{"key": "value"}' } }],
      });

      const result = await provider.completeJSON("test");

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: "json_object" },
        })
      );
      expect(result).toEqual({ key: "value" });
    });

    it("should include system prompt in messages", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '{"valid": true}' } }],
      });

      await provider.completeJSON("user prompt", "system prompt");

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "system", content: "system prompt" },
            { role: "user", content: "user prompt" },
          ],
        })
      );
    });

    it("should retry on invalid JSON", async () => {
      jest.useRealTimers(); // Use real timers for this test
      // First attempt: invalid JSON
      mockChatCompletionsCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "not json" } }],
      });
      // Second attempt: valid JSON
      mockChatCompletionsCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{"valid": true}' } }],
      });

      const result = await provider.completeJSON("test", undefined, 3);

      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ valid: true });
      jest.useFakeTimers(); // Restore fake timers
    }, 30000); // Increase timeout for real timers

    it("should throw on null JSON response", async () => {
      jest.useRealTimers(); // Use real timers for this test
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: "null" } }],
      });

      await expect(provider.completeJSON("test")).rejects.toThrow(/Response is not a JSON object/);
      jest.useFakeTimers(); // Restore fake timers
    }, 30000); // Increase timeout for real timers

    it("should throw on array JSON response", async () => {
      jest.useRealTimers(); // Use real timers for this test
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: "[1, 2, 3]" } }],
      });

      await expect(provider.completeJSON("test")).rejects.toThrow(/Response is not a JSON object/);
      jest.useFakeTimers(); // Restore fake timers
    }, 30000); // Increase timeout for real timers

    it("should throw after max retries", async () => {
      jest.useRealTimers(); // Use real timers for this test
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: "not json" } }],
      });

      await expect(provider.completeJSON("test", undefined, 1)).rejects.toThrow(/Failed to parse JSON response after 1 attempts/);
      jest.useFakeTimers(); // Restore fake timers
    }, 30000); // Increase timeout for real timers

    it("should throw immediately on non-JSON errors", async () => {
      const error = new Error("API rate limit exceeded");
      mockChatCompletionsCreate.mockRejectedValue(error);

      await expect(provider.completeJSON("test")).rejects.toThrow("API rate limit exceeded");
    });

    it("should handle empty content", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      // When content is null, it defaults to "{}" which parses to an empty object
      const result = await provider.completeJSON("test");
      expect(result).toEqual({});
    });
  });

  describe("embed()", () => {
    it("should call embeddings API with correct parameters", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await provider.embed("test text");

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: "test text",
      });
      expect(result).toEqual(mockEmbedding);
    });

    it("should return empty array if embedding is missing", async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{}],
      });

      const result = await provider.embed("test");

      expect(result).toEqual([]);
    });

    it("should return empty array if data is empty", async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [],
      });

      const result = await provider.embed("test");

      expect(result).toEqual([]);
    });

    it("should throw on API error", async () => {
      const error = new Error("API error");
      mockEmbeddingsCreate.mockRejectedValue(error);

      await expect(provider.embed("test")).rejects.toThrow("API error");
    });
  });
});

