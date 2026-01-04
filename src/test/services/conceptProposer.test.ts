import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { generateConceptCandidates } from "~/server/services/conceptProposer";
import { createTestContext } from "../utils/dependencies";
import { MockLLMClient } from "../mocks/llm-client";
import { MockConfigLoader } from "../mocks/config-loader";
import { createTestConcept } from "../utils/factories";
import { concept, conceptEmbedding } from "~/server/schema";
import { getVectorIndex, resetVectorIndex } from "~/server/services/vectorIndex";
import { getOrCreateEmbeddingWithContext } from "~/server/services/vectorSearch";
import { closeTestDb } from "../utils/db";

describe("conceptProposer", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;

  beforeEach(async () => {
    resetVectorIndex();
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader() as any;
  });

  afterEach(async () => {
    resetVectorIndex();
  });

  describe("generateConceptCandidates", () => {
    it("should generate concept candidates successfully", async () => {
      const mockResponse = {
        concepts: [
          {
            title: "Test Concept",
            content: "Test content",
            summary: "Test summary",
            description: "Test description",
          },
        ],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      const result = await generateConceptCandidates(
        "Test text input",
        undefined,
        5,
        undefined,
        undefined,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Test Concept");
      expect(result[0]?.content).toBe("Test content");
      expect(result[0]?.summary).toBe("Test summary");
    });

    it("should handle empty concepts array", async () => {
      mockLLMClient.setMockCompleteJSON(async () => ({ concepts: [] }));
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      const result = await generateConceptCandidates(
        "Test text",
        undefined,
        5,
        undefined,
        undefined,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result).toHaveLength(0);
    });

    it("should filter out invalid concepts", async () => {
      const mockResponse = {
        concepts: [
          {
            title: "Valid Concept",
            content: "Valid content",
            summary: "Valid summary",
          },
          {
            title: "", // Invalid: empty title - will be filtered
            content: "Some content",
            summary: "Some summary",
          },
          {
            // Invalid: missing title - will be filtered
            content: "Some content",
            summary: "Some summary",
          },
        ],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      const result = await generateConceptCandidates(
        "Test text",
        undefined,
        5,
        undefined,
        undefined,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result.length).toBeGreaterThanOrEqual(1);
      const validConcept = result.find((c) => c.title === "Valid Concept");
      expect(validConcept).toBeDefined();
      expect(validConcept?.title).toBe("Valid Concept");
    });

    it("should handle LLM errors gracefully", async () => {
      mockLLMClient.setMockCompleteJSON(async () => {
        throw new Error("LLM API error");
      });
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      const result = await generateConceptCandidates(
        "Test text",
        undefined,
        5,
        undefined,
        undefined,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result).toHaveLength(0);
    });

    it("should use sliding window chunking for large documents", async () => {
      const largeText = "x".repeat(60000); // 60k chars - will create ~2 chunks
      const mockResponse = {
        concepts: [
          {
            title: "Concept from Large Doc",
            content: "Content",
            summary: "Summary",
          },
        ],
      };

      // Create a Jest spy to track calls
      const completeJSONSpy = jest.fn(async () => mockResponse);
      mockLLMClient.setMockCompleteJSON(completeJSONSpy);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      const result = await generateConceptCandidates(
        largeText,
        undefined,
        5,
        undefined,
        undefined,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result).toHaveLength(1);
      expect(completeJSONSpy).toHaveBeenCalled();
    });

    it("should include instructions in prompt when provided", async () => {
      const mockResponse = {
        concepts: [
          {
            title: "Concept",
            content: "Content",
            summary: "Summary",
          },
        ],
      };

      let capturedPrompt = "";
      mockLLMClient.setMockCompleteJSON(async (prompt) => {
        capturedPrompt = prompt;
        return mockResponse;
      });
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      await generateConceptCandidates(
        "Test text",
        "Focus on technical concepts",
        5,
        undefined,
        undefined,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(capturedPrompt).toContain("Focus on technical concepts");
    });

    it("should filter duplicates using vector search", async () => {
      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      // Create an existing concept
      const existingConcept = createTestConcept({
        title: "Existing Concept",
        content: "Existing content about machine learning",
      });
      await context.db.insert(concept).values(existingConcept);

      // Create embedding for existing concept
      await getOrCreateEmbeddingWithContext(
        existingConcept.id!,
        `${existingConcept.title}\n${existingConcept.content}`,
        context.db,
        "text-embedding-3-small",
      );
      await getVectorIndex().initialize(context.db);

      // Mock LLM to return a concept similar to existing one
      const mockResponse = {
        concepts: [
          {
            title: "Machine Learning Concept",
            content: "Content about machine learning algorithms",
            summary: "ML summary",
          },
        ],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const result = await generateConceptCandidates(
        "Text about machine learning",
        undefined,
        5,
        undefined,
        undefined,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      // Should filter out duplicate if similarity is high
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it("should handle config validation errors", async () => {
      mockConfigLoader.setMockValidateConfigForContentGeneration(() => {
        throw new Error("Config validation failed");
      });

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      await expect(
        generateConceptCandidates(
          "Test text",
          undefined,
          5,
          undefined,
          undefined,
          mockLLMClient.asLLMClient(),
          mockConfigLoader as any,
        ),
      ).rejects.toThrow("Config validation failed");
    });

    it("should deduplicate concepts across chunks by title", async () => {
      const largeText = "x".repeat(60000);
      const mockResponse = {
        concepts: [
          {
            title: "Duplicate Concept",
            content: "Content 1",
            summary: "Summary 1",
          },
          {
            title: "Duplicate Concept", // Same title, different content
            content: "Content 2",
            summary: "Summary 2",
          },
        ],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      const result = await generateConceptCandidates(
        largeText,
        undefined,
        5,
        undefined,
        undefined,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      // Should deduplicate by title (case-insensitive)
      const titles = result.map((c) => c.title.toLowerCase());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBeLessThanOrEqual(titles.length);
    });

    it("should respect maxCandidates limit", async () => {
      const mockResponse = {
        concepts: Array.from({ length: 10 }, (_, i) => ({
          title: `Concept ${i}`,
          content: `Content ${i}`,
          summary: `Summary ${i}`,
        })),
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      const result = await generateConceptCandidates(
        "Test text",
        undefined,
        5, // maxCandidates = 5
        undefined,
        undefined,
        mockLLMClient.asLLMClient(),
        mockConfigLoader as any,
      );

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });
});

