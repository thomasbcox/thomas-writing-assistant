/**
 * Tests for GeminiProvider
 * Uses manual mocks from __mocks__/@google/generative-ai.ts
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { GeminiProvider } from "~/server/services/llm/providers/gemini";
import {
  mockGenerateContent,
  mockGetGenerativeModel,
  mockCacheCreate,
  mockCacheUpdate,
  mockCacheDelete,
  _resetMocks,
  _setDefaultSuccess,
} from "../../../__mocks__/@google/generative-ai";

// Mock the logger to avoid console noise
jest.mock("~/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Use manual mock from __mocks__ (configured via moduleNameMapper in jest.config.js)
jest.mock("@google/generative-ai", () => {
  return jest.requireActual("../../../__mocks__/@google/generative-ai");
});

describe("GeminiProvider", () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    jest.useFakeTimers(); // Use fake timers to speed up exponential backoff
    _resetMocks();
    _setDefaultSuccess();
    provider = new GeminiProvider("test-api-key");
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers after each test
  });

  describe("constructor", () => {
    it("should throw error if apiKey is missing", () => {
      expect(() => new GeminiProvider("")).toThrow("GOOGLE_API_KEY environment variable not set");
    });

    it("should initialize with default model and temperature", () => {
      const p = new GeminiProvider("test-key");
      expect(p.getModel()).toBe("gemini-3-pro-preview");
      expect(p.getTemperature()).toBe(0.7);
    });

    it("should initialize with custom model and temperature", () => {
      const p = new GeminiProvider("test-key", "gemini-1.5-flash", 0.9);
      expect(p.getModel()).toBe("gemini-1.5-flash");
      expect(p.getTemperature()).toBe(0.9);
    });
  });

  describe("setModel", () => {
    it("should update the model", () => {
      provider.setModel("gemini-1.5-pro");
      expect(provider.getModel()).toBe("gemini-1.5-pro");
    });
  });

  describe("setTemperature", () => {
    it("should update the temperature", () => {
      provider.setTemperature(0.9);
      expect(provider.getTemperature()).toBe(0.9);
    });
  });

  describe("complete()", () => {
    it("should call generateContent with correct prompt", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "Test response") },
      });

      const result = await provider.complete("test prompt", "system prompt");

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          generationConfig: expect.objectContaining({
            temperature: expect.any(Number),
          }),
        })
      );
      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toBe("Test response");
    });

    it("should combine system and user prompts", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "Response") },
      });

      await provider.complete("user prompt", "system prompt");

      expect(mockGenerateContent).toHaveBeenCalledWith("system prompt\n\nuser prompt");
    });

    it("should use only user prompt when system prompt is missing", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "Response") },
      });

      await provider.complete("user prompt");

      expect(mockGenerateContent).toHaveBeenCalledWith("user prompt");
    });

    it("should use custom temperature when provided", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "Response") },
      });

      await provider.complete("test", undefined, undefined, 0.9);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            temperature: 0.9,
          }),
        })
      );
    });

    it("should retry on 404 model not found error", async () => {
      // First model fails with 404
      mockGenerateContent.mockRejectedValueOnce(new Error("404: Model not found"));
      // Second model succeeds
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: jest.fn(() => "Success") },
      });

      const result = await provider.complete("test");

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toBe("Success");
    });

    it("should throw after all models fail", async () => {
      mockGenerateContent.mockRejectedValue(new Error("404: Model not found"));

      await expect(provider.complete("test")).rejects.toThrow("All Gemini models failed");
    });

    it("should throw immediately on non-404 errors", async () => {
      const error = new Error("API rate limit exceeded");
      mockGenerateContent.mockRejectedValue(error);

      await expect(provider.complete("test")).rejects.toThrow("API rate limit exceeded");
    });

    it("should handle empty response", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "") },
      });

      const result = await provider.complete("test");

      expect(result).toBe("");
    });
  });

  describe("completeJSON()", () => {
    it("should parse valid JSON response", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => '{"key": "value"}') },
      });

      const result = await provider.completeJSON("test prompt");

      expect(result).toEqual({ key: "value" });
    });

    it("should use responseMimeType application/json", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => '{"valid": true}') },
      });

      await provider.completeJSON("test");

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            responseMimeType: "application/json",
          }),
        })
      );
    });

    it("should retry on invalid JSON", async () => {
      jest.useRealTimers(); // Use real timers for this test
      // First attempt returns invalid JSON
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: jest.fn(() => "not json") },
      });
      // Second attempt succeeds
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: jest.fn(() => '{"valid": true}') },
      });

      const result = await provider.completeJSON("test", undefined, undefined, 3);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ valid: true });
      jest.useFakeTimers(); // Restore fake timers
    }, 30000); // Increase timeout for real timers

    it("should throw on null JSON response", async () => {
      jest.useRealTimers(); // Use real timers for this test
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "null") },
      });

      await expect(provider.completeJSON("test", undefined, undefined, 1)).rejects.toThrow(/Failed to parse JSON response/);
      jest.useFakeTimers(); // Restore fake timers
    }, 30000); // Increase timeout for real timers

    it("should throw on array JSON response", async () => {
      jest.useRealTimers(); // Use real timers for this test
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "[1, 2, 3]") },
      });

      await expect(provider.completeJSON("test", undefined, undefined, 1)).rejects.toThrow(/Failed to parse JSON response/);
      jest.useFakeTimers(); // Restore fake timers
    }, 30000); // Increase timeout for real timers

    it("should retry on 404 and then parse JSON", async () => {
      // First model fails with 404
      mockGenerateContent.mockRejectedValueOnce(new Error("404: Model not found"));
      // Second model succeeds with valid JSON
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: jest.fn(() => '{"success": true}') },
      });

      const result = await provider.completeJSON("test");

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it("should throw after max retries with all models", async () => {
      jest.useRealTimers(); // Use real timers for this test
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "not json") },
      });

      await expect(provider.completeJSON("test", undefined, undefined, 1)).rejects.toThrow(/Failed to parse JSON response after 1 attempts/);
      jest.useFakeTimers(); // Restore fake timers
    }, 30000); // Increase timeout for real timers
  });

  describe("embed()", () => {
    it("should call embedding API with correct format", async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: [0.1, 0.2, 0.3] },
        }),
      });

      const result = await provider.embed("test text");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("text-embedding-004"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("test text"),
        })
      );
      expect(result).toEqual([0.1, 0.2, 0.3]);

      global.fetch = originalFetch;
    });

    it("should throw error on API failure", async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = (jest.fn() as any).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      await expect(provider.embed("test")).rejects.toThrow("Gemini embedding API failed");

      global.fetch = originalFetch;
    });

    it("should return empty array if embedding values are missing", async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await provider.embed("test");

      expect(result).toEqual([]);

      global.fetch = originalFetch;
    });
  });

  describe("listAvailableModels()", () => {
    it("should return models from API", async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: "models/gemini-1.5-flash" },
            { name: "models/gemini-1.5-pro" },
            { name: "models/other-model" }, // Should be filtered out
          ],
        }),
      });

      const models = await provider.listAvailableModels();

      expect(models).toContain("gemini-1.5-flash");
      expect(models).toContain("gemini-1.5-pro");
      expect(models).not.toContain("other-model");

      global.fetch = originalFetch;
    });

    it("should fallback to known models on API failure", async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = (jest.fn() as any).mockRejectedValue(new Error("API error"));

      const models = await provider.listAvailableModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain("gemini-3-pro-preview");
      expect(models).toContain("gemini-1.5-flash");

      global.fetch = originalFetch;
    });

    it("should cache models after first call", async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: "models/gemini-1.5-flash" }],
        }),
      });

      const models1 = await provider.listAvailableModels();
      const models2 = await provider.listAvailableModels();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(models1).toEqual(models2);

      global.fetch = originalFetch;
    });

    it("should handle non-200 response status", async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = (jest.fn() as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const models = await provider.listAvailableModels();

      // Should fallback to known models
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain("gemini-3-pro-preview");

      global.fetch = originalFetch;
    });
  });

  describe("findWorkingModel()", () => {
    it("should return first model from preferred list", async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: "models/gemini-1.5-flash" },
            { name: "models/gemini-1.5-pro" },
          ],
        }),
      });

      const model = await provider.findWorkingModel();

      expect(model).toBe("gemini-1.5-flash");

      global.fetch = originalFetch;
    });

    it("should fallback to known models when API fails", async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = (jest.fn() as any).mockRejectedValue(new Error("API error"));

      const model = await provider.findWorkingModel();

      expect(model).toBe("gemini-1.5-flash");

      global.fetch = originalFetch;
    });
  });

  describe("context caching", () => {
    it("should create context cache with versioned model", async () => {
      mockCacheCreate.mockResolvedValue({ name: "cachedContents/test-cache-123" });

      const cacheId = await provider.createContextCache("Large static content here", 3600);

      expect(mockCacheCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.stringContaining("gemini-1.5"),
          ttlSeconds: 3600,
          contents: [
            {
              role: "user",
              parts: [{ text: "Large static content here" }],
            },
          ],
        })
      );
      expect(cacheId).toBe("cachedContents/test-cache-123");
    });

    it("should use cached content in complete() when cache ID provided", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "Cached response") },
      });

      const result = await provider.complete(
        "test prompt",
        "system prompt",
        undefined,
        undefined,
        undefined,
        "cachedContents/test-cache-123"
      );

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          cachedContent: expect.objectContaining({
            name: "cachedContents/test-cache-123",
            contents: [],
          }),
        })
      );
      expect(result).toBe("Cached response");
    });

    it("should preserve conversation history when cache is active", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => "Response with history") },
      });

      const conversationHistory = [
        { role: "user" as const, content: "First message" },
        { role: "assistant" as const, content: "First response" },
        { role: "user" as const, content: "Second message" },
      ];

      await provider.complete(
        "new prompt",
        "system prompt",
        undefined,
        undefined,
        conversationHistory,
        "cachedContents/test-cache-123"
      );

      // Verify cache is used
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          cachedContent: expect.objectContaining({
            name: "cachedContents/test-cache-123",
            contents: [],
          }),
        })
      );

      // Verify conversation history is included in the prompt
      const generateCall = mockGenerateContent.mock.calls[0][0];
      expect(generateCall).toContain("[User]: First message");
      expect(generateCall).toContain("[Assistant]: First response");
      expect(generateCall).toContain("[User]: Second message");
      expect(generateCall).toContain("[System]: system prompt");
      expect(generateCall).toContain("[User]: new prompt");
    });

    it("should preserve conversation history in completeJSON() when cache is active", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: jest.fn(() => '{"result": "success"}') },
      });

      const conversationHistory = [
        { role: "user" as const, content: "Previous question" },
        { role: "assistant" as const, content: "Previous answer" },
      ];

      await provider.completeJSON(
        "new question",
        "system prompt",
        conversationHistory,
        3,
        "cachedContents/test-cache-123"
      );

      // Verify cache is used
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          cachedContent: expect.objectContaining({
            name: "cachedContents/test-cache-123",
            contents: [],
          }),
        })
      );

      // Verify conversation history is included
      const generateCall = mockGenerateContent.mock.calls[0][0];
      expect(generateCall).toContain("[User]: Previous question");
      expect(generateCall).toContain("[Assistant]: Previous answer");
      expect(generateCall).toContain("[User]: new question");
    });

    it("should update cache TTL", async () => {
      mockCacheUpdate.mockResolvedValue(undefined);

      await provider.updateCacheTTL("cachedContents/test-cache-123", 7200);

      expect(mockCacheUpdate).toHaveBeenCalledWith("cachedContents/test-cache-123", { ttlSeconds: 7200 });
    });

    it("should use default TTL when updating cache", async () => {
      mockCacheUpdate.mockResolvedValue(undefined);

      await provider.updateCacheTTL("cachedContents/test-cache-123");

      expect(mockCacheUpdate).toHaveBeenCalledWith("cachedContents/test-cache-123", { ttlSeconds: 3600 });
    });

    it("should delete cache", async () => {
      mockCacheDelete.mockResolvedValue(undefined);

      await provider.deleteCache("cachedContents/test-cache-123");

      expect(mockCacheDelete).toHaveBeenCalledWith("cachedContents/test-cache-123");
    });

    it("should map unversioned models to versioned for caching", async () => {
      provider.setModel("gemini-1.5-flash");
      mockCacheCreate.mockResolvedValue({ name: "cachedContents/test-cache-123" });
      
      await provider.createContextCache("test content");

      expect(mockCacheCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "models/gemini-1.5-flash-001",
        })
      );
    });
  });
});

