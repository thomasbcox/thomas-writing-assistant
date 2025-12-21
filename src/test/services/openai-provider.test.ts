/**
 * Tests for OpenAIProvider
 * Uses Drizzle ORM for database access
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Create mock functions that will be used in the mock factory
const mockChatCompletionsCreate = jest.fn();

// Mock the OpenAI module - factory creates mocks inline
jest.mock("openai", () => {
  const mockCreate = jest.fn();
  const mockClient = {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  };

  const MockOpenAI = jest.fn().mockImplementation(() => mockClient);

  // Export the mock create function so tests can access it
  (MockOpenAI as any).__mockCreate = mockCreate;

  return {
    __esModule: true,
    default: MockOpenAI,
  };
});

// Import after mocks
import { OpenAIProvider } from "~/server/services/llm/providers/openai";
import OpenAI from "openai";

// Helper to get the mock create function
function getMockCreate() {
  const MockOpenAI = OpenAI as any;
  // Access the mock create function from the mock factory
  return MockOpenAI.__mockCreate as jest.Mock;
}

describe("OpenAIProvider", () => {
  const apiKey = "test-api-key-12345";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create provider with API key", () => {
      const provider = new OpenAIProvider(apiKey);
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.getModel()).toBe("gpt-4o-mini");
      expect(provider.getTemperature()).toBe(0.7);
    });

    it("should create provider with custom model and temperature", () => {
      const provider = new OpenAIProvider(apiKey, "gpt-4", 0.9);
      expect(provider.getModel()).toBe("gpt-4");
      expect(provider.getTemperature()).toBe(0.9);
    });
  });

  describe("complete", () => {
    it("should complete a prompt successfully", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "Test response",
            },
          },
        ],
      });

      const result = await provider.complete("Test prompt");

      expect(result).toBe("Test response");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: "Test prompt",
            }),
          ]),
        }),
      );
    });

    it("should include system prompt when provided", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "Response",
            },
          },
        ],
      });

      await provider.complete("Prompt", "System prompt");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: "System prompt",
            }),
            expect.objectContaining({
              role: "user",
              content: "Prompt",
            }),
          ]),
        }),
      );
    });

    it("should use custom temperature when provided", async () => {
      const provider = new OpenAIProvider(apiKey, "gpt-4", 0.9);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "Response",
            },
          },
        ],
      });

      await provider.complete("Prompt");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
        }),
      );
    });

    it("should use maxTokens when provided", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "Response",
            },
          },
        ],
      });

      await provider.complete("Prompt", undefined, 100);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 100,
        }),
      );
    });

    it("should handle empty response", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({
        choices: [],
      });

      const result = await provider.complete("Prompt");

      expect(result).toBe("");
    });

    it("should handle missing choices", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({});

      const result = await provider.complete("Prompt");

      expect(result).toBe("");
    });

    it("should handle API errors", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockRejectedValue(new Error("API Error"));

      await expect(provider.complete("Prompt")).rejects.toThrow("API Error");
    });
  });

  describe("completeJSON", () => {
    it("should return parsed JSON response", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"key": "value"}',
            },
          },
        ],
      });

      const result = await provider.completeJSON("Prompt");

      expect(result).toEqual({ key: "value" });
    });

    it("should include system prompt in JSON requests", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "{}",
            },
          },
        ],
      });

      await provider.completeJSON("Prompt", "System");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: "System",
            }),
          ]),
        }),
      );
    });

    it("should throw error on invalid JSON", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "Invalid JSON {",
            },
          },
        ],
      });

      await expect(provider.completeJSON("Prompt")).rejects.toThrow();
    });

    it("should handle empty JSON response", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "{}",
            },
          },
        ],
      });

      const result = await provider.completeJSON("Prompt");

      expect(result).toEqual({});
    });

    it("should handle API errors in JSON requests", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockRejectedValue(new Error("API Error"));

      await expect(provider.completeJSON("Prompt")).rejects.toThrow("API Error");
    });
  });

  describe("error handling", () => {
    it("should handle network errors", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockRejectedValue(new Error("Network error"));

      await expect(provider.complete("Prompt")).rejects.toThrow("Network error");
    });

    it("should handle authentication errors", async () => {
      const provider = new OpenAIProvider(apiKey);
      const mockCreate = getMockCreate();

      mockCreate.mockRejectedValue(new Error("Invalid API key"));

      await expect(provider.complete("Prompt")).rejects.toThrow("Invalid API key");
    });
  });
});
