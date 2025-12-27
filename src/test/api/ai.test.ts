/**
 * Tests for AI API routes
 * GET /api/ai/settings - Get AI settings
 * PUT /api/ai/settings - Update AI settings
 * GET /api/ai/models - Get available models
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { setDependencies, resetDependencies } from "~/server/dependencies";
import { createTestDependencies, createMockLLMClient } from "../utils/dependencies";

jest.mock("~/env", () => ({
  env: {
    OPENAI_API_KEY: "test-openai-key",
    GOOGLE_API_KEY: "test-gemini-key",
  },
}));

describe("AI API", () => {
  // Import route handlers after mocks are set up
  let getSettings: typeof import("~/app/api/ai/settings/route").GET;
  let updateSettings: typeof import("~/app/api/ai/settings/route").PUT;
  let getModels: typeof import("~/app/api/ai/models/route").GET;
  
  let testDependencies: Awaited<ReturnType<typeof createTestDependencies>>;
  let mockLLMClient: ReturnType<typeof createMockLLMClient>;

  beforeAll(async () => {
    // Create test dependencies with mocks
    mockLLMClient = createMockLLMClient({
      getProvider: jest.fn(() => "gemini"),
      getModel: jest.fn(() => "gemini-3-pro-preview"),
      getTemperature: jest.fn(() => 0.7),
      setProvider: jest.fn((provider: string) => {
        mockLLMClient.getProvider.mockReturnValue(provider);
      }),
      setModel: jest.fn((model: string) => {
        mockLLMClient.getModel.mockReturnValue(model);
      }),
      setTemperature: jest.fn((temp: number) => {
        mockLLMClient.getTemperature.mockReturnValue(temp);
      }),
    });
    
    testDependencies = await createTestDependencies({
      llmClient: mockLLMClient,
    });
    
    // Set dependencies for the application
    setDependencies(testDependencies);
    
    // Dynamic import to ensure mocks are applied
    const settingsModule = await import("~/app/api/ai/settings/route");
    const modelsModule = await import("~/app/api/ai/models/route");
    getSettings = settingsModule.GET;
    updateSettings = settingsModule.PUT;
    getModels = modelsModule.GET;
  });

  afterAll(() => {
    resetDependencies();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to return default values
    mockLLMClient.getProvider.mockReturnValue("gemini");
    mockLLMClient.getModel.mockReturnValue("gemini-3-pro-preview");
    mockLLMClient.getTemperature.mockReturnValue(0.7);
    // Reset setter mocks
    mockLLMClient.setProvider.mockImplementation((provider: string) => {
      mockLLMClient.getProvider.mockReturnValue(provider);
    });
    mockLLMClient.setModel.mockImplementation((model: string) => {
      mockLLMClient.getModel.mockReturnValue(model);
    });
    mockLLMClient.setTemperature.mockImplementation((temp: number) => {
      mockLLMClient.getTemperature.mockReturnValue(temp);
    });
  });

  describe("GET /api/ai/settings", () => {
    it("should return AI settings", async () => {
      // Set the mock to return the expected default model
      mockLLMClient.getModel.mockReturnValue("gemini-3-pro-preview");
      
      const response = await getSettings();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.provider).toBe("gemini");
      expect(data.model).toBe("gemini-3-pro-preview"); // Updated to match actual default
      expect(data.temperature).toBe(0.7);
      expect(data.availableProviders).toBeDefined();
      expect(data.availableProviders.openai).toBe(true);
      expect(data.availableProviders.gemini).toBe(true);
    });
  });

  describe("PUT /api/ai/settings", () => {
    it("should update AI settings", async () => {
      // Reset mocks before test
      mockLLMClient.setProvider.mockClear();
      mockLLMClient.setModel.mockClear();
      mockLLMClient.setTemperature.mockClear();
      
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
      // Verify the setters were called (they update the mock state)
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
      // Update the mock to return openai
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
      // Ensure mock returns gemini (default)
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
