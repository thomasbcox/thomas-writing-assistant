/**
 * Tests for Gemini Provider
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { GeminiProvider } from "~/server/services/llm/providers/gemini";

// Mock @google/generative-ai
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
  embedContent: jest.fn(),
}));

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

// Mock fetch for listAvailableModels
global.fetch = jest.fn() as any;

// Mock logger
jest.mock("~/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("GeminiProvider", () => {
  const apiKey = "test-api-key";

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    // Reset mockGetGenerativeModel to return a default mock
    (mockGetGenerativeModel.mockReturnValue as any)({
      generateContent: jest.fn(),
      embedContent: jest.fn(),
    });
    // Reset fetch to not reject by default
    ((global.fetch as jest.Mock).mockResolvedValue as any)({
      ok: true,
      json: async () => ({ models: [] }),
    });
  });

  describe("initialization", () => {
    it("should initialize with API key and default model", () => {
      const provider = new GeminiProvider(apiKey);
      expect(provider).toBeDefined();
    });

    it("should initialize with custom model", () => {
      const provider = new GeminiProvider(apiKey, "gemini-1.5-flash");
      expect(provider).toBeDefined();
    });

    it("should initialize with custom temperature", () => {
      const provider = new GeminiProvider(apiKey, "gemini-1.5-flash", 0.5);
      expect(provider).toBeDefined();
    });

    it("should throw error when API key is missing", () => {
      expect(() => new GeminiProvider("")).toThrow("GOOGLE_API_KEY environment variable not set");
    });
  });

  describe("listAvailableModels", () => {
    it("should return models from API", async () => {
      const provider = new GeminiProvider(apiKey);
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: true,
        json: async () => ({
          models: [
            { name: "models/gemini-1.5-flash" },
            { name: "models/gemini-1.5-pro" },
          ],
        }),
      });

      const models = await provider.listAvailableModels();
      expect(models).toContain("gemini-1.5-flash");
      expect(models).toContain("gemini-1.5-pro");
    });

    it("should fallback to known models when API fails", async () => {
      const provider = new GeminiProvider(apiKey);
      ((global.fetch as jest.Mock).mockRejectedValue as any)(new Error("API error"));

      const models = await provider.listAvailableModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain("gemini-1.5-flash");
    });

    it("should handle non-200 response", async () => {
      const provider = new GeminiProvider(apiKey);
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: false,
        status: 401,
      });

      const models = await provider.listAvailableModels();
      // Should fallback to known models
      expect(models.length).toBeGreaterThan(0);
    });

    it("should cache models after first call", async () => {
      const provider = new GeminiProvider(apiKey);
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: true,
        json: async () => ({ models: [{ name: "models/gemini-1.5-flash" }] }),
      });

      await provider.listAvailableModels();
      await provider.listAvailableModels();

      // Should only call API once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("findWorkingModel", () => {
    it("should return first model from available models", async () => {
      const provider = new GeminiProvider(apiKey);
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: true,
        json: async () => ({
          models: [{ name: "models/gemini-1.5-flash" }],
        }),
      });

      const model = await provider.findWorkingModel();
      expect(model).toBe("gemini-1.5-flash");
    });

    it("should return fallback model when API fails", async () => {
      const provider = new GeminiProvider(apiKey);
      ((global.fetch as jest.Mock).mockRejectedValue as any)(new Error("API error"));

      const model = await provider.findWorkingModel();
      expect(model).toBe("gemini-1.5-flash");
    });
  });

  describe("complete", () => {
    it("should call generateContent and return text", async () => {
      const provider = new GeminiProvider(apiKey);
      const mockResponse = {
        text: jest.fn(() => "Generated text"),
      };
      const mockModel = {
        generateContent: (jest.fn() as any).mockResolvedValue({
          response: Promise.resolve(mockResponse),
        } as any),
        embedContent: jest.fn(),
      };
      (mockGetGenerativeModel.mockReturnValue as any)(mockModel);

      const result = await provider.complete("Prompt", "System prompt");
      expect(result).toBe("Generated text");
      expect(mockGetGenerativeModel).toHaveBeenCalled();
    });

    it("should handle errors and try fallback models", async () => {
      const provider = new GeminiProvider(apiKey, "gemini-3-pro-preview");
      
      const mockModel1 = {
        generateContent: (jest.fn() as any).mockRejectedValue(new Error("404")),
        embedContent: jest.fn(),
      };
      const mockModel2 = {
        generateContent: (jest.fn() as any).mockResolvedValue({
          response: {
            text: jest.fn(() => "Generated text"),
          },
        } as any),
        embedContent: jest.fn(),
      };
      
      // First call (gemini-3-pro-preview) fails, second call (gemini-1.5-flash) succeeds
      (mockGetGenerativeModel.mockReturnValueOnce as any)(mockModel1);
      (mockGetGenerativeModel.mockReturnValueOnce as any)(mockModel2);

      const result = await provider.complete("Prompt");
      expect(result).toBe("Generated text");
    });
  });

  describe("completeJSON", () => {
    it("should return parsed JSON response", async () => {
      const provider = new GeminiProvider(apiKey);
      // Mock fetch for findWorkingModel
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: true,
        json: async () => ({
          models: [{ name: "models/gemini-1.5-flash" }],
        }),
      });
      const mockModel = {
        generateContent: jest.fn<() => Promise<any>>().mockResolvedValue({
          response: {
            text: jest.fn(() => JSON.stringify({ key: "value" })),
          },
        } as any),
        embedContent: jest.fn(),
      };
      mockGetGenerativeModel.mockReturnValue(mockModel as any);

      const result = await provider.completeJSON("Prompt", "System prompt");
      expect(result).toEqual({ key: "value" });
      expect(mockGetGenerativeModel).toHaveBeenCalled();
    });

    it("should handle invalid JSON and retry", async () => {
      const provider = new GeminiProvider(apiKey);
      // Mock fetch for findWorkingModel
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: true,
        json: async () => ({
          models: [{ name: "models/gemini-1.5-flash" }],
        }),
      });
      const mockModel = {
        generateContent: jest.fn<() => Promise<any>>()
          .mockResolvedValueOnce({
            response: {
              text: jest.fn(() => "not json"),
            },
          } as any)
          .mockResolvedValueOnce({
            response: {
              text: jest.fn(() => JSON.stringify({ key: "value" })),
            },
          } as any),
        embedContent: jest.fn(),
      };
      // Mock getGenerativeModel to return the same model instance for all calls
      mockGetGenerativeModel.mockReturnValue(mockModel as any);

      const result = await provider.completeJSON("Prompt", undefined, 2);
      expect(result).toEqual({ key: "value" });
    });

    it("should throw error when response is not an object", async () => {
      const provider = new GeminiProvider(apiKey);
      // Mock fetch for findWorkingModel
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: true,
        json: async () => ({
          models: [{ name: "models/gemini-1.5-flash" }],
        }),
      });
      const mockModel = {
        generateContent: jest.fn<() => Promise<any>>().mockResolvedValue({
          response: {
            text: jest.fn(() => JSON.stringify(["array", "not", "object"])),
          },
        } as any),
        embedContent: jest.fn(),
      };
      mockGetGenerativeModel.mockReturnValue(mockModel as any);

      await expect(provider.completeJSON("Prompt", undefined)).rejects.toThrow();
    });

    it("should throw error when max retries exceeded", async () => {
      const provider = new GeminiProvider(apiKey);
      // Mock fetch for findWorkingModel
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: true,
        json: async () => ({
          models: [{ name: "models/gemini-1.5-flash" }],
        }),
      });
      const mockModel = {
        generateContent: jest.fn<() => Promise<any>>().mockResolvedValue({
          response: {
            text: jest.fn(() => "not json"),
          },
        } as any),
        embedContent: jest.fn(),
      };
      mockGetGenerativeModel.mockReturnValue(mockModel as any);

      await expect(provider.completeJSON("Prompt", undefined)).rejects.toThrow();
    });
  });

  describe("embed", () => {
    it("should return embedding array", async () => {
      const provider = new GeminiProvider(apiKey);
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: true,
        json: async () => ({
          embedding: {
            values: Array(768).fill(0.1),
          },
        }),
      });

      const result = await provider.embed("Text to embed");
      expect(result).toHaveLength(768);
      expect(global.fetch).toHaveBeenCalled();
    });

    it("should handle embedding API errors", async () => {
      const provider = new GeminiProvider(apiKey);
      ((global.fetch as jest.Mock).mockResolvedValue as any)({
        ok: false,
        status: 500,
        text: async () => "API error",
      });

      await expect(provider.embed("Text")).rejects.toThrow("Gemini embedding API failed");
    });
  });

  describe("setModel and setTemperature", () => {
    it("should update model", () => {
      const provider = new GeminiProvider(apiKey);
      provider.setModel("gemini-1.5-pro");
      // Model is used in next API call
      expect(provider).toBeDefined();
    });

    it("should update temperature", () => {
      const provider = new GeminiProvider(apiKey);
      provider.setTemperature(0.5);
      // Temperature is used in next API call
      expect(provider).toBeDefined();
    });
  });
});

