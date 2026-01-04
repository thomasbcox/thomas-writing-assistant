/**
 * Tests for LLM Client
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { LLMClient, getLLMClient, resetLLMClient } from "~/server/services/llm/client";
import type { LLMProvider } from "~/server/services/llm/types";

// Mock process.env directly since env is a Proxy that reads from it
const originalEnv = process.env;

beforeEach(() => {
  process.env.GOOGLE_API_KEY = "test-google-key";
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock providers
const mockGeminiProvider = {
  complete: jest.fn(),
  completeJSON: jest.fn(),
  embed: jest.fn(),
  setModel: jest.fn(),
  setTemperature: jest.fn(),
};

const mockOpenAIProvider = {
  complete: jest.fn(),
  completeJSON: jest.fn(),
  embed: jest.fn(),
  setModel: jest.fn(),
  setTemperature: jest.fn(),
};

jest.mock("~/server/services/llm/providers/gemini", () => ({
  GeminiProvider: jest.fn().mockImplementation(() => mockGeminiProvider),
}));

jest.mock("~/server/services/llm/providers/openai", () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => mockOpenAIProvider),
}));

describe("LLMClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLLMClient();
  });

  describe("initialization", () => {
    it("should initialize with Gemini provider when specified", () => {
      const client = new LLMClient({ provider: "gemini" });
      expect(client.getProvider()).toBe("gemini");
      expect(client.getModel()).toBe("gemini-3-pro-preview");
    });

    it("should initialize with OpenAI provider when specified", () => {
      const client = new LLMClient({ provider: "openai" });
      expect(client.getProvider()).toBe("openai");
      expect(client.getModel()).toBe("gpt-4o-mini");
    });

    it("should default to Gemini when GOOGLE_API_KEY is available", () => {
      const client = new LLMClient();
      expect(client.getProvider()).toBe("gemini");
    });

    it("should default to OpenAI when only OPENAI_API_KEY is available", () => {
      // Temporarily remove Google key
      const originalGoogleKey = process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      // Need to reset client to pick up new env
      resetLLMClient();
      const client = new LLMClient();
      expect(client.getProvider()).toBe("openai");

      process.env.GOOGLE_API_KEY = originalGoogleKey;
    });

    it("should throw error when no API keys are available", () => {
      const originalGoogleKey = process.env.GOOGLE_API_KEY;
      const originalOpenAIKey = process.env.OPENAI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;

      resetLLMClient();
      expect(() => new LLMClient()).toThrow("No LLM provider API keys found");

      process.env.GOOGLE_API_KEY = originalGoogleKey;
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    });

    it("should throw error when Gemini provider requested but no key", () => {
      const originalGoogleKey = process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      expect(() => new LLMClient({ provider: "gemini" })).toThrow(
        "GOOGLE_API_KEY environment variable not set",
      );

      process.env.GOOGLE_API_KEY = originalGoogleKey;
    });

    it("should throw error when OpenAI provider requested but no key", () => {
      const originalOpenAIKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => new LLMClient({ provider: "openai" })).toThrow(
        "OPENAI_API_KEY environment variable not set",
      );

      process.env.OPENAI_API_KEY = originalOpenAIKey;
    });

    it("should use custom model when provided", () => {
      const client = new LLMClient({ provider: "gemini", model: "gemini-1.5-flash" });
      expect(client.getModel()).toBe("gemini-1.5-flash");
    });

    it("should use custom temperature when provided", () => {
      const client = new LLMClient({ provider: "openai", temperature: 0.9 });
      expect(client.getTemperature()).toBe(0.9);
    });
  });

  describe("setModel", () => {
    it("should update model for Gemini provider", () => {
      const client = new LLMClient({ provider: "gemini" });
      client.setModel("gemini-1.5-pro");
      expect(client.getModel()).toBe("gemini-1.5-pro");
      expect(mockGeminiProvider.setModel).toHaveBeenCalledWith("gemini-1.5-pro");
    });

    it("should update model for OpenAI provider", () => {
      const client = new LLMClient({ provider: "openai" });
      client.setModel("gpt-4o");
      expect(client.getModel()).toBe("gpt-4o");
      expect(mockOpenAIProvider.setModel).toHaveBeenCalledWith("gpt-4o");
    });
  });

  describe("setTemperature", () => {
    it("should update temperature for Gemini provider", () => {
      const client = new LLMClient({ provider: "gemini" });
      client.setTemperature(0.5);
      expect(client.getTemperature()).toBe(0.5);
      expect(mockGeminiProvider.setTemperature).toHaveBeenCalledWith(0.5);
    });

    it("should update temperature for OpenAI provider", () => {
      const client = new LLMClient({ provider: "openai" });
      client.setTemperature(0.8);
      expect(client.getTemperature()).toBe(0.8);
      expect(mockOpenAIProvider.setTemperature).toHaveBeenCalledWith(0.8);
    });
  });

  describe("setProvider", () => {
    it("should switch from Gemini to OpenAI", () => {
      const client = new LLMClient({ provider: "gemini" });
      client.setProvider("openai");
      expect(client.getProvider()).toBe("openai");
      expect(client.getModel()).toBe("gpt-4o-mini");
    });

    it("should switch from OpenAI to Gemini", () => {
      const client = new LLMClient({ provider: "openai" });
      client.setProvider("gemini");
      expect(client.getProvider()).toBe("gemini");
      expect(client.getModel()).toBe("gemini-3-pro-preview");
    });

    it("should not recreate provider if already using it", () => {
      const client = new LLMClient({ provider: "gemini" });
      const originalProvider = (client as any).provider;
      client.setProvider("gemini");
      expect((client as any).provider).toBe(originalProvider);
    });

    it("should throw error when switching to Gemini without key", () => {
      const client = new LLMClient({ provider: "openai" });
      const originalGoogleKey = process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      expect(() => client.setProvider("gemini")).toThrow(
        "GOOGLE_API_KEY environment variable not set",
      );

      process.env.GOOGLE_API_KEY = originalGoogleKey;
    });

    it("should throw error when switching to OpenAI without key", () => {
      const client = new LLMClient({ provider: "gemini" });
      const originalOpenAIKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => client.setProvider("openai")).toThrow(
        "OPENAI_API_KEY environment variable not set",
      );

      process.env.OPENAI_API_KEY = originalOpenAIKey;
    });
  });

  describe("method delegation", () => {
    it("should delegate complete to provider", async () => {
      const client = new LLMClient({ provider: "gemini" });
      (mockGeminiProvider.complete as any).mockResolvedValue("Response text");

      const result = await client.complete("Prompt", "System prompt");
      expect(result).toBe("Response text");
      expect(mockGeminiProvider.complete).toHaveBeenCalledWith("Prompt", "System prompt", undefined, undefined);
    });

    it("should delegate completeJSON to provider", async () => {
      const client = new LLMClient({ provider: "openai" });
      (mockOpenAIProvider.completeJSON as any).mockResolvedValue({ key: "value" });

      const result = await client.completeJSON("Prompt", "System prompt");
      expect(result).toEqual({ key: "value" });
      expect(mockOpenAIProvider.completeJSON).toHaveBeenCalledWith("Prompt", "System prompt");
    });

    it("should delegate embed to provider", async () => {
      const client = new LLMClient({ provider: "gemini" });
      (mockGeminiProvider.embed as any).mockResolvedValue([0.1, 0.2, 0.3]);

      const result = await client.embed("Text to embed");
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockGeminiProvider.embed).toHaveBeenCalledWith("Text to embed");
    });
  });

  describe("getLLMClient singleton", () => {
    it("should return same instance on multiple calls", () => {
      const client1 = getLLMClient();
      const client2 = getLLMClient();
      expect(client1).toBe(client2);
    });

    it("should return new instance after reset", () => {
      const client1 = getLLMClient();
      resetLLMClient();
      const client2 = getLLMClient();
      expect(client1).not.toBe(client2);
    });
  });
});

