/**
 * Tests for conceptEnricher service
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { LLMClient } from "~/server/services/llm/client";
import type { ConfigLoader } from "~/server/services/config";
import type { ConceptFormData } from "~/server/services/conceptEnricher";

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
  let mockLLMClient: LLMClient;
  let mockConfigLoader: ConfigLoader;
  const mockConceptData: ConceptFormData = {
    title: "Test Concept",
    description: "Test description",
    content: "Test content",
    creator: "",
    source: "",
    year: "",
  };

  beforeEach(async () => {
    mockLLMClient = {
      completeJSON: jest.fn(),
      complete: jest.fn(),
      getProvider: jest.fn(() => "openai"),
      getModel: jest.fn(() => "gpt-4"),
    } as unknown as LLMClient;

    mockConfigLoader = {
      getSystemPrompt: jest.fn((prompt) => prompt),
    } as unknown as ConfigLoader;

    // Dynamically import after mocks are set up
    jest.clearAllMocks();
  });

  describe("analyzeConcept", () => {
    it("should analyze a concept and return suggestions", async () => {
      const { analyzeConcept } = await import("~/server/services/conceptEnricher");
      
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

      jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

      const result = await analyzeConcept(
        mockConceptData,
        mockLLMClient,
        mockConfigLoader,
      );

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.quickActions).toBeDefined();
      expect(result.initialMessage).toBeDefined();
    });

    it("should handle empty suggestions gracefully", async () => {
      const { analyzeConcept } = await import("~/server/services/conceptEnricher");
      
      const mockResponse = {
        greeting: "Concept looks good",
        suggestions: [],
        quickActions: [],
      };

      jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

      const result = await analyzeConcept(
        mockConceptData,
        mockLLMClient,
        mockConfigLoader,
      );

      expect(result.suggestions).toEqual([]);
      expect(result.quickActions).toEqual([]);
    });
  });

  describe("enrichMetadata", () => {
    it("should enrich metadata for a concept", async () => {
      const { enrichMetadata } = await import("~/server/services/conceptEnricher");
      
      const mockResponse = {
        creator: "Test Author",
        year: "2024",
        source: "Test Source",
        sourceUrl: "https://example.com",
        confidence: "high" as const,
      };

      jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

      const result = await enrichMetadata(
        "Test Concept",
        "Test description",
        mockLLMClient,
        mockConfigLoader,
      );

      expect(result.creator).toBe("Test Author");
      expect(result.year).toBe("2024");
      expect(result.source).toBe("Test Source");
    });

    it("should handle partial metadata", async () => {
      const { enrichMetadata } = await import("~/server/services/conceptEnricher");
      
      const mockResponse = {
        creator: "Test Author",
        // year and source missing
      };

      jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

      const result = await enrichMetadata(
        "Test Concept",
        "Test description",
        mockLLMClient,
        mockConfigLoader,
      );

      expect(result.creator).toBe("Test Author");
      expect(result.year).toBeUndefined();
      expect(result.source).toBeUndefined();
    });
  });

  describe("expandDefinition", () => {
    it("should expand a definition", async () => {
      const { expandDefinition } = await import("~/server/services/conceptEnricher");
      
      const mockResponse = "This is an expanded definition with more detail and context.";

      jest.mocked(mockLLMClient.complete).mockResolvedValue(mockResponse);

      const result = await expandDefinition(
        "Short definition",
        "Test Concept",
        mockLLMClient,
        mockConfigLoader,
      );

      expect(result).toBe(mockResponse.trim());
      expect(result).toContain("expanded definition");
    });

    it("should handle empty response", async () => {
      const { expandDefinition } = await import("~/server/services/conceptEnricher");
      
      jest.mocked(mockLLMClient.complete).mockResolvedValue("");

      const result = await expandDefinition(
        "Short definition",
        "Test Concept",
        mockLLMClient,
        mockConfigLoader,
      );

      expect(result).toBe("");
    });
  });

  describe("chatEnrichConcept", () => {
    it("should handle chat messages and return response with suggestions", async () => {
      const { chatEnrichConcept } = await import("~/server/services/conceptEnricher");
      
      const mockResponse = {
        response: "Here are some suggestions to improve your concept",
        suggestions: [
          {
            id: "1",
            field: "title",
            currentValue: "Test Concept",
            suggestedValue: "Improved Test Concept",
            reason: "More descriptive",
            confidence: "medium" as const,
          },
        ],
        actions: [
          {
            id: "1",
            label: "Add Examples",
            description: "Add examples to illustrate the concept",
            action: "addExamples" as const,
          },
        ],
      };

      jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

      const result = await chatEnrichConcept(
        "Improve the concept",
        mockConceptData,
        [{ id: "1", role: "user", content: "How can I improve this?", timestamp: new Date() }],
        mockLLMClient,
        mockConfigLoader,
      );

      expect(result.response).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.actions).toBeDefined();
    });

    it("should handle empty chat history", async () => {
      const { chatEnrichConcept } = await import("~/server/services/conceptEnricher");
      
      const mockResponse = {
        response: "Initial response",
        suggestions: [],
        actions: [],
      };

      jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

      const result = await chatEnrichConcept(
        "Help me understand this concept",
        mockConceptData,
        [],
        mockLLMClient,
        mockConfigLoader,
      );

      expect(result.response).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should handle LLM errors in analyzeConcept", async () => {
      const { analyzeConcept } = await import("~/server/services/conceptEnricher");
      
      jest.mocked(mockLLMClient.completeJSON).mockRejectedValue(
        new Error("LLM API error"),
      );

      await expect(
        analyzeConcept(mockConceptData, mockLLMClient, mockConfigLoader),
      ).rejects.toThrow();
    });

    it("should handle LLM errors in enrichMetadata", async () => {
      const { enrichMetadata } = await import("~/server/services/conceptEnricher");
      
      jest.mocked(mockLLMClient.completeJSON).mockRejectedValue(
        new Error("LLM API error"),
      );

      await expect(
        enrichMetadata("Test", "Desc", mockLLMClient, mockConfigLoader),
      ).rejects.toThrow();
    });

    it("should handle LLM errors in expandDefinition", async () => {
      const { expandDefinition } = await import("~/server/services/conceptEnricher");
      
      jest.mocked(mockLLMClient.complete).mockRejectedValue(
        new Error("LLM API error"),
      );

      await expect(
        expandDefinition("Def", "Title", mockLLMClient, mockConfigLoader),
      ).rejects.toThrow();
    });
  });
});

