/**
 * Tests for conceptEnricher service
 * Uses ServiceContext pattern for dependency injection
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { analyzeConcept, enrichMetadata, expandDefinition, chatEnrichConcept } from "~/server/services/conceptEnricher";
import { createTestContext } from "../utils/dependencies";
import { MockLLMClient } from "../mocks/llm-client";
import { MockConfigLoader } from "../mocks/config-loader";
import type { ConceptFormData } from "~/server/services/conceptEnricher";
import { resetVectorIndex } from "~/server/services/vectorIndex";
import { closeTestDb } from "../utils/db";

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

describe("conceptEnricher", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;
  let context: Awaited<ReturnType<typeof createTestContext>>;
  const mockConceptData: ConceptFormData = {
    title: "Test Concept",
    description: "Test description",
    content: "Test content",
    creator: "",
    source: "",
    year: "",
  };

  beforeEach(async () => {
    resetVectorIndex();
    jest.clearAllMocks();
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader() as any;
    context = await createTestContext({
      llm: mockLLMClient.asLLMClient(),
      config: mockConfigLoader as any,
    });
  });

  afterEach(async () => {
    resetVectorIndex();
    if (context?.db) {
      closeTestDb(context.db);
    }
  });

  describe("analyzeConcept", () => {
    it("should analyze a concept and return suggestions", async () => {
      const mockResponse = {
        greeting: "Hello, I can help improve this concept",
        suggestions: [
          {
            id: "1",
            field: "creator",
            currentValue: "",
            suggestedValue: "Test Author",
            reason: "Missing creator information",
            confidence: "high" as const,
          },
        ],
        quickActions: [
          {
            id: "1",
            label: "Fetch Metadata",
            description: "Fetch metadata from Wikipedia",
            action: "fetchMetadata" as const,
          },
        ],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const result = await analyzeConcept(
        mockConceptData,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.quickActions).toBeDefined();
      expect(result.initialMessage).toBeDefined();
    });

    it("should handle empty suggestions gracefully", async () => {
      const mockResponse = {
        greeting: "Concept looks good",
        suggestions: [],
        quickActions: [],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);

      const result = await analyzeConcept(
        mockConceptData,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result.suggestions).toEqual([]);
      expect(result.quickActions).toEqual([]);
      expect(result.initialMessage).toBeDefined();
    });

    it("should handle invalid JSON response", async () => {
      mockLLMClient.setMockCompleteJSON(async () => ({ invalid: "response" }));

      const result = await analyzeConcept(
        mockConceptData,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      // Should still return valid structure with empty arrays
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.quickActions).toBeDefined();
      expect(Array.isArray(result.quickActions)).toBe(true);
    });
  });

  describe("enrichMetadata", () => {
    it("should enrich metadata for a concept", async () => {
      const mockResponse = {
        creator: "Test Author",
        source: "Test Source",
        year: "2024",
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const result = await enrichMetadata(
        "Test Concept",
        "Test description",
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result.creator).toBe("Test Author");
      expect(result.source).toBe("Test Source");
      expect(result.year).toBe("2024");
    });

    it("should handle missing fields in response", async () => {
      const mockResponse = {
        creator: "Test Author",
        // Missing source and year
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);

      const result = await enrichMetadata(
        "Test Concept",
        "Test description",
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result.creator).toBe("Test Author");
      // Missing fields should be undefined (not empty strings)
      expect(result.source).toBeUndefined();
      expect(result.year).toBeUndefined();
    });
  });

  describe("expandDefinition", () => {
    it("should expand a concept definition", async () => {
      const mockResponse = {
        expandedDefinition: "This is an expanded definition with more detail.",
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const result = await expandDefinition(
        "Test Concept",
        "Short definition",
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle empty response", async () => {
      mockLLMClient.setMockCompleteJSON(async () => ({}));

      const result = await expandDefinition(
        "Test Concept",
        "Short definition",
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });

  describe("chatEnrichConcept", () => {
    it("should generate chat response for concept enrichment", async () => {
      const mockResponse = {
        message: "I can help you improve this concept.",
        suggestions: [
          {
            field: "description",
            suggestedValue: "Improved description",
            reason: "More detailed",
          },
        ],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const conceptDataWithContent: ConceptFormData = {
        ...mockConceptData,
        content: "Test content for chat enrichment",
      };

      const result = await chatEnrichConcept(
        "How can I improve this?",
        conceptDataWithContent,
        [],
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result.response).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it("should handle conversation history", async () => {
      const mockResponse = {
        message: "Based on our conversation...",
        suggestions: [],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);

      const history = [
        {
          id: "1",
          role: "user" as const,
          content: "Previous message",
          timestamp: new Date(),
        },
      ];

      const conceptDataWithContent: ConceptFormData = {
        ...mockConceptData,
        content: "Test content for chat enrichment",
      };

      const result = await chatEnrichConcept(
        "Follow-up question",
        conceptDataWithContent,
        history,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result.response).toBeDefined();
      // Verify the response was generated (can't easily spy on internal LLM calls)
      expect(typeof result.response).toBe("string");
    });
  });
});

