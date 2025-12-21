/**
 * Tests for AI API routes
 * GET /api/ai/settings - Get AI settings
 * PUT /api/ai/settings - Update AI settings
 * GET /api/ai/models - Get available models
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { GET as getSettings, PUT as updateSettings } from "~/app/api/ai/settings/route";
import { GET as getModels } from "~/app/api/ai/models/route";
import { NextRequest } from "next/server";

// Mock LLM client
let currentProvider: string = "openai";
let currentModel: string = "gpt-4o-mini";
let currentTemperature: number = 0.7;

const mockLLMClient = {
  getProvider: jest.fn(() => currentProvider),
  getModel: jest.fn(() => currentModel),
  getTemperature: jest.fn(() => currentTemperature),
  setProvider: jest.fn((provider: string) => {
    currentProvider = provider;
  }),
  setModel: jest.fn((model: string) => {
    currentModel = model;
  }),
  setTemperature: jest.fn((temp: number) => {
    currentTemperature = temp;
  }),
};

jest.mock("~/server/services/llm/client", () => ({
  getLLMClient: jest.fn(() => mockLLMClient),
}));

jest.mock("~/env", () => ({
  env: {
    OPENAI_API_KEY: "test-openai-key",
    GOOGLE_API_KEY: "test-gemini-key",
  },
}));

describe("AI API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to defaults (LLM client defaults to gemini if both keys are available)
    currentProvider = "gemini";
    currentModel = "gemini-1.5-flash";
    currentTemperature = 0.7;
  });

  describe("GET /api/ai/settings", () => {
    it("should return AI settings", async () => {
      const response = await getSettings();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.provider).toBe("gemini");
      expect(data.model).toBe("gemini-1.5-flash");
      expect(data.temperature).toBe(0.7);
      expect(data.availableProviders).toBeDefined();
      expect(data.availableProviders.openai).toBe(true);
      expect(data.availableProviders.gemini).toBe(true);
    });
  });

  describe("PUT /api/ai/settings", () => {
    it("should update AI settings", async () => {
      const request = new NextRequest("http://localhost/api/ai/settings", {
        method: "PUT",
        body: JSON.stringify({
          provider: "gemini",
          model: "gemini-1.5-flash",
          temperature: 0.8,
        }),
      });

      const response = await updateSettings(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.provider).toBe("gemini");
      expect(data.model).toBe("gemini-1.5-flash");
      expect(data.temperature).toBe(0.8);
      expect(mockLLMClient.setProvider).toHaveBeenCalledWith("gemini");
      expect(mockLLMClient.setModel).toHaveBeenCalledWith("gemini-1.5-flash");
      expect(mockLLMClient.setTemperature).toHaveBeenCalledWith(0.8);
    });

    it("should validate input", async () => {
      const request = new NextRequest("http://localhost/api/ai/settings", {
        method: "PUT",
        body: JSON.stringify({
          provider: "invalid-provider", // Invalid
        }),
      });

      const response = await updateSettings(request);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/ai/models", () => {
    it("should return OpenAI models when provider is OpenAI", async () => {
      currentProvider = "openai";
      mockLLMClient.getProvider.mockReturnValue("openai");

      const response = await getModels();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.provider).toBe("openai");
      expect(Array.isArray(data.models)).toBe(true);
      expect(data.models.length).toBeGreaterThan(0);
      expect(data.models[0]).toHaveProperty("value");
      expect(data.models[0]).toHaveProperty("label");
    });

    it("should return Gemini models when provider is Gemini", async () => {
      mockLLMClient.getProvider.mockReturnValue("gemini");

      const response = await getModels();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.provider).toBe("gemini");
      expect(Array.isArray(data.models)).toBe(true);
      expect(data.models.length).toBeGreaterThan(0);
      expect(data.models[0]).toHaveProperty("value");
      expect(data.models[0]).toHaveProperty("label");
    });
  });
});
