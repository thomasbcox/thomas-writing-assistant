/**
 * Tests for enrichment IPC handlers
 * Tests the enrichment:analyze, enrichment:enrichMetadata, enrichment:chat, and enrichment:expandDefinition handlers
 * 
 * Note: Since the conceptEnricher functions accept optional LLMClient and ConfigLoader parameters,
 * we can test them directly by passing mock dependencies.
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

describe("Enrichment Handlers", () => {
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

    jest.clearAllMocks();
  });

  describe("enrichment:analyze", () => {
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
        quickActions: ["fetchMetadata"],
      };

      jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

      const result = await analyzeConcept(
        mockConceptData,
        mockLLMClient as unknown as LLMClient,
        mockConfigLoader as unknown as ConfigLoader,
      );

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]?.field).toBe("creator");
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
        mockLLMClient as unknown as LLMClient,
        mockConfigLoader as unknown as ConfigLoader,
      );

      expect(result.suggestions).toEqual([]);
      expect(result.quickActions).toEqual([]);
    });
  });

  describe("enrichment:enrichMetadata", () => {
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
        mockLLMClient as unknown as LLMClient,
        mockConfigLoader as unknown as ConfigLoader,
      );

      expect(result.creator).toBe("Test Author");
      expect(result.year).toBe("2024");
      expect(result.source).toBe("Test Source");
      expect(result.confidence).toBe("high");
    });

    it("should handle partial metadata responses", async () => {
      const { enrichMetadata } = await import("~/server/services/conceptEnricher");
      
      const mockResponse = {
        creator: "Test Author",
        confidence: "medium" as const,
        // year and source missing
      };

      jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

      const result = await enrichMetadata(
        "Test Concept",
        "Test description",
        mockLLMClient as unknown as LLMClient,
        mockConfigLoader as unknown as ConfigLoader,
      );

      expect(result.creator).toBe("Test Author");
      expect(result.year).toBeUndefined();
      expect(result.source).toBeUndefined();
      expect(result.confidence).toBe("medium");
    });
  });

  describe("enrichment:chat", () => {
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
        actions: ["addExamples"],
      };

      jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

      const chatHistory = [
        { 
          id: "1", 
          role: "user" as const, 
          content: "How can I improve this?", 
          timestamp: new Date() 
        }
      ];

      const result = await chatEnrichConcept(
        "Improve the concept",
        mockConceptData,
        chatHistory,
        mockLLMClient as unknown as LLMClient,
        mockConfigLoader as unknown as ConfigLoader,
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
        mockLLMClient as unknown as LLMClient,
        mockConfigLoader as unknown as ConfigLoader,
      );

      expect(result.response).toBeDefined();
    });
  });

  describe("enrichment:expandDefinition", () => {
    it("should expand a definition", async () => {
      const { expandDefinition } = await import("~/server/services/conceptEnricher");
      
      const mockResponse = "This is an expanded definition with more detail and context.";

      jest.mocked(mockLLMClient.complete).mockResolvedValue(mockResponse);

      const result = await expandDefinition(
        "Short definition",
        "Test Concept",
        mockLLMClient as unknown as LLMClient,
        mockConfigLoader as unknown as ConfigLoader,
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
        mockLLMClient as unknown as LLMClient,
        mockConfigLoader as unknown as ConfigLoader,
      );

      expect(result).toBe("");
    });
  });

  describe("error handling", () => {
    it("should handle LLM errors in analyzeConcept", async () => {
      const { analyzeConcept } = await import("~/server/services/conceptEnricher");
      
      jest.mocked(mockLLMClient.completeJSON).mockRejectedValue(
        new Error("LLM API error"),
      );

      await expect(
        analyzeConcept(
          mockConceptData, 
          mockLLMClient as unknown as LLMClient, 
          mockConfigLoader as unknown as ConfigLoader
        ),
      ).rejects.toThrow();
    });

    it("should handle LLM errors in enrichMetadata", async () => {
      const { enrichMetadata } = await import("~/server/services/conceptEnricher");
      
      jest.mocked(mockLLMClient.completeJSON).mockRejectedValue(
        new Error("LLM API error"),
      );

      await expect(
        enrichMetadata(
          "Test", 
          "Desc", 
          mockLLMClient as unknown as LLMClient, 
          mockConfigLoader as unknown as ConfigLoader
        ),
      ).rejects.toThrow();
    });

    it("should handle LLM errors in expandDefinition", async () => {
      const { expandDefinition } = await import("~/server/services/conceptEnricher");
      
      jest.mocked(mockLLMClient.complete).mockRejectedValue(
        new Error("LLM API error"),
      );

      await expect(
        expandDefinition(
          "Def", 
          "Title", 
          mockLLMClient as unknown as LLMClient, 
          mockConfigLoader as unknown as ConfigLoader
        ),
      ).rejects.toThrow();
    });

    it("should handle LLM errors in chatEnrichConcept when both JSON and text fail", async () => {
      const { chatEnrichConcept } = await import("~/server/services/conceptEnricher");
      
      // chatEnrichConcept has a fallback from completeJSON to complete
      // So we need both to fail for the error to propagate
      jest.mocked(mockLLMClient.completeJSON).mockRejectedValue(
        new Error("LLM API error"),
      );
      jest.mocked(mockLLMClient.complete).mockRejectedValue(
        new Error("LLM API error"),
      );

      await expect(
        chatEnrichConcept(
          "Message", 
          mockConceptData, 
          [],
          mockLLMClient as unknown as LLMClient, 
          mockConfigLoader as unknown as ConfigLoader
        ),
      ).rejects.toThrow();
    });

    it("should fallback to plain text when JSON fails in chatEnrichConcept", async () => {
      const { chatEnrichConcept } = await import("~/server/services/conceptEnricher");
      
      // completeJSON fails, but complete succeeds
      jest.mocked(mockLLMClient.completeJSON).mockRejectedValue(
        new Error("JSON parsing error"),
      );
      jest.mocked(mockLLMClient.complete).mockResolvedValue(
        "Here is a plain text response",
      );

      const result = await chatEnrichConcept(
        "Message", 
        mockConceptData, 
        [],
        mockLLMClient as unknown as LLMClient, 
        mockConfigLoader as unknown as ConfigLoader
      );

      expect(result.response).toBe("Here is a plain text response");
      expect(result.suggestions).toBeUndefined();
    });
  });
});
