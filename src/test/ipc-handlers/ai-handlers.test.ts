/**
 * Tests for AI IPC handlers
 * Tests AI settings, model selection, and embedding status
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { ipcMain } from "electron";
import { createTestDb, migrateTestDb, closeTestDb } from "../utils/db";
import { invokeHandler } from "../utils/ipc";
import { resetVectorIndex } from "~/server/services/vectorIndex";
import type { DatabaseInstance } from "~/server/db";
import { MockLLMClient } from "../mocks/llm-client";

// Mock the logger
jest.mock("~/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logServiceError: jest.fn(),
}));

// Mock process.env (env module reads from process.env at access time)
const originalEnv = process.env;

// Mock LLM client
const mockGetLLMClient = jest.fn();
jest.mock("~/server/services/llm/client", () => ({
  getLLMClient: () => mockGetLLMClient(),
}));

// Mock embeddingOrchestrator using unstable_mockModule for ES modules
const mockGetEmbeddingStatus = jest.fn() as jest.MockedFunction<() => Promise<{ totalConcepts: number; conceptsWithEmbeddings: number; conceptsWithoutEmbeddings: number; isIndexing: boolean; lastIndexedAt: string | null }>>;
const mockCheckAndGenerateMissing = jest.fn() as jest.MockedFunction<(batchSize?: number) => Promise<void>>;

jest.unstable_mockModule("~/server/services/embeddingOrchestrator", () => ({
  getEmbeddingStatus: mockGetEmbeddingStatus,
  checkAndGenerateMissing: mockCheckAndGenerateMissing,
}));

// Import handlers after mocks (using dynamic import for ES modules)
let registerAiHandlers: () => void;

describe("AI IPC Handlers", () => {
  let testDb: DatabaseInstance;
  let mockLLMClient: MockLLMClient;

  beforeAll(async () => {
    // Import handlers after mocks are set up
    const handlersModule = await import("../../../electron/ipc-handlers/ai-handlers.js");
    registerAiHandlers = handlersModule.registerAiHandlers;
  });

  beforeEach(async () => {
    // Set up process.env with API keys
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.GOOGLE_API_KEY = "test-google-key";

    testDb = createTestDb();
    await migrateTestDb(testDb);
    resetVectorIndex();
    (globalThis as any).__TEST_DB__ = testDb;

    // Create a fresh mock client for each test
    mockLLMClient = new MockLLMClient();
    mockLLMClient.setProvider("openai"); // Default provider
    mockGetLLMClient.mockReturnValue(mockLLMClient.asLLMClient());

    // Register handlers
    registerAiHandlers();

    // Reset mocks (but keep the LLM client mock return value)
    mockGetEmbeddingStatus.mockClear();
    mockCheckAndGenerateMissing.mockClear();
    // Re-set the LLM client mock after clearing (jest.clearAllMocks clears it)
    mockGetLLMClient.mockReturnValue(mockLLMClient.asLLMClient());
  });

  afterEach(async () => {
    await closeTestDb(testDb);
    resetVectorIndex();
    delete (globalThis as any).__TEST_DB__;
    
    // Restore original process.env
    process.env = originalEnv;
    
    // Remove all IPC handlers
    const channels = ["ai:getSettings", "ai:updateSettings", "ai:getAvailableModels", "ai:getEmbeddingStatus", "ai:generateMissingEmbeddings", "ai:retryFailedEmbeddings"];
    for (const channel of channels) {
      if (ipcMain.removeHandler) {
        ipcMain.removeHandler(channel);
      }
    }
    jest.clearAllMocks();
  });

  describe("ai:getSettings", () => {
    it("should return default settings when no API keys are available", async () => {
      // Temporarily remove API keys
      const originalOpenAI = process.env.OPENAI_API_KEY;
      const originalGoogle = process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const result = await invokeHandler<undefined, { provider: string; model: string; temperature: number; availableProviders: { openai: boolean; gemini: boolean } }>("ai:getSettings", undefined);

      expect(result).toEqual({
        provider: "openai",
        model: "gpt-4o-mini",
        temperature: 0.7,
        availableProviders: {
          openai: false,
          gemini: false,
        },
      });

      // Restore
      if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
      if (originalGoogle) process.env.GOOGLE_API_KEY = originalGoogle;
    });

    it("should return current LLM client settings", async () => {
      // Update the existing mock client with specific settings
      mockLLMClient.setProvider("openai");
      mockLLMClient.setModel("gpt-4o");
      mockLLMClient.setTemperature(0.8);
      // Ensure mock returns the updated client (getLLMClient is a singleton)
      mockGetLLMClient.mockReturnValue(mockLLMClient.asLLMClient());

      const result = await invokeHandler<undefined, { provider: string; model: string; temperature: number; availableProviders: { openai: boolean; gemini: boolean } }>("ai:getSettings", undefined);

      // Verify the result matches what we set
      expect(result.provider).toBe("openai");
      expect(result.model).toBe("gpt-4o");
      expect(result.temperature).toBe(0.8);
      expect(result.availableProviders).toEqual({
        openai: true,
        gemini: true,
      });
    });

    it("should handle LLM client creation failure gracefully", async () => {
      mockGetLLMClient.mockImplementation(() => {
        throw new Error("Failed to create client");
      });

      const result = await invokeHandler<undefined, { provider: string; model: string; temperature: number; availableProviders: { openai: boolean; gemini: boolean } }>("ai:getSettings", undefined);

      // Should return fallback settings
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("model");
      expect(result).toHaveProperty("temperature");
      expect(result).toHaveProperty("availableProviders");
    });
  });

  describe("ai:updateSettings", () => {
    it("should update provider", async () => {
      // Use the existing mock client and ensure it starts with openai
      mockLLMClient.setProvider("openai");
      mockGetLLMClient.mockReturnValue(mockLLMClient.asLLMClient());

      const result = await invokeHandler<{ provider: "gemini" }, { provider: string; model: string; temperature: number }>("ai:updateSettings", {
        provider: "gemini",
      });

      // The handler should return the updated provider
      expect(result.provider).toBe("gemini");
      // Verify the mock client was updated (handler calls setProvider on it)
      expect(mockLLMClient.getProvider()).toBe("gemini");
    });

    it("should update model", async () => {
      const result = await invokeHandler<{ model: string }, { provider: string; model: string; temperature: number }>("ai:updateSettings", {
        model: "gpt-4-turbo",
      });

      expect(result.model).toBe("gpt-4-turbo");
    });

    it("should update temperature", async () => {
      const result = await invokeHandler<{ temperature: number }, { provider: string; model: string; temperature: number }>("ai:updateSettings", {
        temperature: 0.9,
      });

      expect(result.temperature).toBe(0.9);
    });

    it("should update multiple settings at once", async () => {
      const result = await invokeHandler<{ provider: "openai"; model: string; temperature: number }, { provider: string; model: string; temperature: number }>("ai:updateSettings", {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.6,
      });

      expect(result.provider).toBe("openai");
      expect(result.model).toBe("gpt-4o");
      expect(result.temperature).toBe(0.6);
    });

    it("should throw error when no API keys are available", async () => {
      const originalOpenAI = process.env.OPENAI_API_KEY;
      const originalGoogle = process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      await expect(
        invokeHandler("ai:updateSettings", { provider: "openai" })
      ).rejects.toThrow("No LLM provider API keys found");

      // Restore
      if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
      if (originalGoogle) process.env.GOOGLE_API_KEY = originalGoogle;
    });

    it("should throw error when provider API key is missing", async () => {
      const originalGoogle = process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      await expect(
        invokeHandler("ai:updateSettings", { provider: "gemini" })
      ).rejects.toThrow("GOOGLE_API_KEY not set");

      // Restore
      if (originalGoogle) process.env.GOOGLE_API_KEY = originalGoogle;
    });
  });

  describe("ai:getAvailableModels", () => {
    it("should return OpenAI models when OpenAI is selected", async () => {
      // Create a fresh mock client with OpenAI provider
      const testClient = new MockLLMClient();
      testClient.setProvider("openai");
      mockGetLLMClient.mockReturnValue(testClient.asLLMClient());

      const result = await invokeHandler<undefined, { provider: string; models: Array<{ value: string; label: string }> }>("ai:getAvailableModels", undefined);

      expect(result.provider).toBe("openai");
      expect(result.models).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: "gpt-4o-mini" }),
          expect.objectContaining({ value: "gpt-4o" }),
        ])
      );
    });

    it("should return Gemini models when Gemini is selected", async () => {
      // Update the existing mock client to use Gemini
      mockLLMClient.setProvider("gemini");
      mockGetLLMClient.mockReturnValue(mockLLMClient.asLLMClient());

      const result = await invokeHandler<undefined, { provider: string; models: Array<{ value: string; label: string }> }>("ai:getAvailableModels", undefined);

      expect(result.provider).toBe("gemini");
      expect(result.models).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: "gemini-3-pro-preview" }),
          expect.objectContaining({ value: "gemini-1.5-flash" }),
        ])
      );
    });

    it("should return default OpenAI models when no API keys are available", async () => {
      const originalOpenAI = process.env.OPENAI_API_KEY;
      const originalGoogle = process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const result = await invokeHandler<undefined, { provider: string; models: Array<{ value: string; label: string }> }>("ai:getAvailableModels", undefined);

      expect(result.provider).toBe("openai");
      expect(result.models).toHaveLength(4);

      // Restore
      if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
      if (originalGoogle) process.env.GOOGLE_API_KEY = originalGoogle;
    });

    it("should handle client creation failure gracefully", async () => {
      mockGetLLMClient.mockImplementation(() => {
        throw new Error("Failed to create client");
      });

      const result = await invokeHandler<undefined, { provider: string; models: Array<{ value: string; label: string }> }>("ai:getAvailableModels", undefined);

      // Should return fallback models
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("models");
      expect(Array.isArray(result.models)).toBe(true);
    });
  });

  describe("ai:getEmbeddingStatus", () => {
    it("should return embedding status", async () => {
      const mockStatus = {
        totalConcepts: 10,
        conceptsWithEmbeddings: 8,
        conceptsWithoutEmbeddings: 2,
        isIndexing: false,
        lastIndexedAt: new Date().toISOString(),
      };
      mockGetEmbeddingStatus.mockResolvedValue(mockStatus);

      const result = await invokeHandler<undefined, { totalConcepts: number; conceptsWithEmbeddings: number; conceptsWithoutEmbeddings: number; isIndexing: boolean; lastIndexedAt: string | null }>("ai:getEmbeddingStatus", undefined);

      expect(result).toEqual({
        totalConcepts: 10,
        conceptsWithEmbeddings: 8,
        conceptsWithoutEmbeddings: 2,
        isIndexing: false,
        lastIndexedAt: expect.any(String),
      });
      expect(mockGetEmbeddingStatus).toHaveBeenCalled();
    });
  });

  describe("ai:generateMissingEmbeddings", () => {
    it("should generate missing embeddings and return status", async () => {
      mockCheckAndGenerateMissing.mockResolvedValue(undefined as any);
      const mockStatus = {
        totalConcepts: 10,
        conceptsWithEmbeddings: 10,
        conceptsWithoutEmbeddings: 0,
        isIndexing: false,
        lastIndexedAt: new Date().toISOString(),
      };
      mockGetEmbeddingStatus.mockResolvedValue(mockStatus);

      const result = await invokeHandler<{ batchSize: number }, { totalConcepts: number; conceptsWithEmbeddings: number; conceptsWithoutEmbeddings: number; isIndexing: boolean; lastIndexedAt: string | null }>("ai:generateMissingEmbeddings", {
        batchSize: 5,
      });

      expect(mockCheckAndGenerateMissing).toHaveBeenCalledWith(5);
      expect(mockGetEmbeddingStatus).toHaveBeenCalled();
      expect(result).toHaveProperty("totalConcepts");
    });

    it("should use default batch size when not provided", async () => {
      mockCheckAndGenerateMissing.mockResolvedValue(undefined as any);
      const mockStatus = {
        totalConcepts: 10,
        conceptsWithEmbeddings: 10,
        conceptsWithoutEmbeddings: 0,
        isIndexing: false,
        lastIndexedAt: new Date().toISOString(),
      };
      mockGetEmbeddingStatus.mockResolvedValue(mockStatus);

      await invokeHandler("ai:generateMissingEmbeddings", {});

      expect(mockCheckAndGenerateMissing).toHaveBeenCalledWith(10);
    });
  });

  describe("ai:retryFailedEmbeddings", () => {
    it("should retry failed embeddings and return status", async () => {
      mockCheckAndGenerateMissing.mockResolvedValue(undefined as any);
      const mockStatus = {
        totalConcepts: 10,
        conceptsWithEmbeddings: 10,
        conceptsWithoutEmbeddings: 0,
        isIndexing: false,
        lastIndexedAt: new Date().toISOString(),
      };
      mockGetEmbeddingStatus.mockResolvedValue(mockStatus);

      const result = await invokeHandler<{ batchSize: number }, { totalConcepts: number; conceptsWithEmbeddings: number; conceptsWithoutEmbeddings: number; isIndexing: boolean; lastIndexedAt: string | null }>("ai:retryFailedEmbeddings", {
        batchSize: 3,
      });

      expect(mockCheckAndGenerateMissing).toHaveBeenCalledWith(3);
      expect(mockGetEmbeddingStatus).toHaveBeenCalled();
      expect(result).toHaveProperty("totalConcepts");
    });
  });
});

