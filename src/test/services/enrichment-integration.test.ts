/**
 * Integration tests for enrichment operations with real database records
 * These tests create actual concepts in the test database and test enrichment operations
 * Uses Drizzle ORM for database access
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  createTestDb,
  cleanupTestData,
  migrateTestDb,
} from "../test-utils";
import { MockLLMClient } from "../mocks/llm-client";
import { MockConfigLoader } from "../mocks/config-loader";
import {
  analyzeConcept,
  enrichMetadata,
  expandDefinition,
  chatEnrichConcept,
} from "~/server/services/conceptEnricher";
import type { ReturnType } from "~/server/db";
import { concept } from "~/server/schema";
import { createId } from "@paralleldrive/cuid2";

type Database = ReturnType<typeof import("~/server/db").db>;

describe("Enrichment Integration Tests", () => {
  let testDb: Database;
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;

  beforeAll(async () => {
    testDb = createTestDb();
    await migrateTestDb(testDb);
  });

  beforeEach(async () => {
    await cleanupTestData(testDb);
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader();
  });

  afterAll(async () => {
    await cleanupTestData(testDb);
    // Close SQLite connection
    const sqlite = (testDb as any).session?.client as Database | undefined;
    if (sqlite && typeof sqlite.close === "function") {
      sqlite.close();
    }
  });

  describe("analyzeConcept with real concept", () => {
    it("should analyze a concept created in the database", async () => {
      // Create a real concept in the test database
      const [createdConcept] = await testDb
        .insert(concept)
        .values({
          identifier: "zettel-test-001",
          title: "Test Concept",
          description: "A test concept for enrichment",
          content: "This is test content that needs enrichment",
          creator: "",
          source: "",
          year: "",
          status: "active",
        })
        .returning();

      // Set up mock LLM response
      const mockResponse = {
        greeting: "I can help improve this concept",
        suggestions: [
          {
            id: "1",
            field: "creator" as const,
            currentValue: "",
            suggestedValue: "Test Author",
            reason: "Missing creator information",
            confidence: "high" as const,
          },
          {
            id: "2",
            field: "source" as const,
            currentValue: "",
            suggestedValue: "Test Source",
            reason: "Missing source information",
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

      // Convert database concept to ConceptFormData
      const conceptData = {
        title: createdConcept.title,
        description: createdConcept.description || "",
        content: createdConcept.content,
        creator: createdConcept.creator,
        source: createdConcept.source,
        year: createdConcept.year,
      };

      // Test enrichment analysis
      const result = await analyzeConcept(
        conceptData,
        mockLLMClient as any,
        mockConfigLoader as any,
      );

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]?.field).toBe("creator");
      expect(result.suggestions[0]?.suggestedValue).toBe("Test Author");
      expect(result.quickActions).toBeDefined();
      expect(result.initialMessage).toBeDefined();
    });

    it("should handle concepts with partial metadata", async () => {
      const [createdConcept] = await testDb
        .insert(concept)
        .values({
          identifier: "zettel-test-002",
          title: "Partial Concept",
          description: "Concept with some metadata",
          content: "Content here",
          creator: "Existing Creator",
          source: "",
          year: "2024",
          status: "active",
        })
        .returning();

      const mockResponse = {
        greeting: "Concept looks mostly good",
        suggestions: [
          {
            id: "1",
            field: "source" as const,
            currentValue: "",
            suggestedValue: "Suggested Source",
            reason: "Missing source",
            confidence: "medium" as const,
          },
        ],
        quickActions: [],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test prompt");

      const conceptData = {
        title: createdConcept.title,
        description: createdConcept.description || "",
        content: createdConcept.content,
        creator: createdConcept.creator,
        source: createdConcept.source,
        year: createdConcept.year,
      };

      const result = await analyzeConcept(
        conceptData,
        mockLLMClient as any,
        mockConfigLoader as any,
      );

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBe(1);
      expect(result.suggestions[0]?.field).toBe("source");
    });
  });

  describe("enrichMetadata with real concept", () => {
    it("should enrich metadata for a concept from the database", async () => {
      const [createdConcept] = await testDb
        .insert(concept)
        .values({
          identifier: "zettel-test-003",
          title: "Metadata Test Concept",
          description: "A concept needing metadata enrichment",
          content: "Content for metadata test",
          creator: "",
          source: "",
          year: "",
          status: "active",
        })
        .returning();

      const mockResponse = {
        creator: "Enriched Author",
        year: "2024",
        source: "Enriched Source",
        sourceUrl: "https://example.com/source",
        confidence: "high" as const,
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test prompt");

      const result = await enrichMetadata(
        createdConcept.title,
        createdConcept.description || "",
        mockLLMClient as any,
        mockConfigLoader as any,
      );

      expect(result.creator).toBe("Enriched Author");
      expect(result.year).toBe("2024");
      expect(result.source).toBe("Enriched Source");
      expect(result.sourceUrl).toBe("https://example.com/source");
    });
  });

  describe("expandDefinition with real concept", () => {
    it("should expand definition for a concept from the database", async () => {
      const [createdConcept] = await testDb
        .insert(concept)
        .values({
          identifier: "zettel-test-005",
          title: "Definition Test Concept",
          description: "Short definition",
          content: "This is a short definition that needs expansion",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "active",
        })
        .returning();

      const mockResponse =
        "This is an expanded definition with more detail, context, and comprehensive explanation of the concept.";

      mockLLMClient.setMockComplete(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test prompt");

      const result = await expandDefinition(
        createdConcept.description || "",
        createdConcept.title,
        mockLLMClient as any,
        mockConfigLoader as any,
      );

      expect(result).toBe(mockResponse.trim());
      expect(result).toContain("expanded definition");
      expect(result.length).toBeGreaterThan(
        createdConcept.description?.length || 0,
      );
    });
  });

  describe("chatEnrichConcept with real concept", () => {
    it("should handle chat enrichment for a concept from the database", async () => {
      const [createdConcept] = await testDb
        .insert(concept)
        .values({
          identifier: "zettel-test-006",
          title: "Chat Test Concept",
          description: "A concept for chat enrichment",
          content: "Content for chat test",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "active",
        })
        .returning();

      const mockResponse = {
        response: "Here are some suggestions to improve your concept",
        suggestions: [
          {
            id: "1",
            field: "title" as const,
            currentValue: createdConcept.title,
            suggestedValue: "Improved Chat Test Concept",
            reason: "More descriptive title",
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

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test prompt");

      const conceptData = {
        title: createdConcept.title,
        description: createdConcept.description || "",
        content: createdConcept.content,
        creator: createdConcept.creator,
        source: createdConcept.source,
        year: createdConcept.year,
      };

      const result = await chatEnrichConcept(
        "How can I improve this concept?",
        conceptData,
        [
          {
            id: "1",
            role: "user" as const,
            content: "I want to make this better",
            timestamp: new Date(),
          },
        ],
        mockLLMClient as any,
        mockConfigLoader as any,
      );

      expect(result.response).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.actions).toBeDefined();
    });
  });

  describe("Full enrichment workflow", () => {
    it("should perform complete enrichment workflow on a concept", async () => {
      // Create concept
      const [createdConcept] = await testDb
        .insert(concept)
        .values({
          identifier: "zettel-test-008",
          title: "Workflow Test Concept",
          description: "Short description",
          content: "Basic content",
          creator: "",
          source: "",
          year: "",
          status: "active",
        })
        .returning();

      const conceptData = {
        title: createdConcept.title,
        description: createdConcept.description || "",
        content: createdConcept.content,
        creator: createdConcept.creator,
        source: createdConcept.source,
        year: createdConcept.year,
      };

      // Step 1: Analyze
      mockLLMClient.setMockCompleteJSON(async () => ({
        greeting: "Analysis complete",
        suggestions: [
          {
            id: "1",
            field: "creator" as const,
            currentValue: "",
            suggestedValue: "Workflow Author",
            reason: "Missing creator",
            confidence: "high" as const,
          },
        ],
        quickActions: [
          {
            id: "1",
            label: "Enrich Metadata",
            description: "Fetch metadata",
            action: "fetchMetadata" as const,
          },
        ],
      }));
      mockConfigLoader.setMockSystemPrompt("Test prompt");

      const analysis = await analyzeConcept(
        conceptData,
        mockLLMClient as any,
        mockConfigLoader as any,
      );
      expect(analysis.suggestions.length).toBeGreaterThan(0);

      // Step 2: Enrich metadata
      mockLLMClient.setMockCompleteJSON(async () => ({
        creator: "Workflow Author",
        year: "2024",
        source: "Workflow Source",
        confidence: "high" as const,
      }));

      const metadata = await enrichMetadata(
        createdConcept.title,
        createdConcept.description || "",
        mockLLMClient as any,
        mockConfigLoader as any,
      );
      expect(metadata.creator).toBe("Workflow Author");

      // Step 3: Expand definition
      mockLLMClient.setMockComplete(async () =>
        "Expanded definition with more detail",
      );

      const expanded = await expandDefinition(
        createdConcept.description || "",
        createdConcept.title,
        mockLLMClient as any,
        mockConfigLoader as any,
      );
      expect(expanded).toContain("Expanded definition");

      // Step 4: Chat enrichment
      mockLLMClient.setMockCompleteJSON(async () => ({
        response: "Chat response",
        suggestions: [],
        actions: [],
      }));

      const chat = await chatEnrichConcept(
        "Final improvements?",
        conceptData,
        [],
        mockLLMClient as any,
        mockConfigLoader as any,
      );
      expect(chat.response).toBeDefined();
    });
  });
});
