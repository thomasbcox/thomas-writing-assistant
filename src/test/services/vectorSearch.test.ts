import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { createTestDb, migrateTestDb } from "../utils/db";
import { createTestConcept, createTestEmbedding, createDeterministicEmbedding } from "../utils/factories";
import { getOrCreateEmbedding, findSimilarConcepts } from "~/server/services/vectorSearch";
import type { DatabaseInstance } from "~/server/db";
import { concept, conceptEmbedding } from "~/server/schema";
import { eq } from "drizzle-orm";
import { resetVectorIndex } from "~/server/services/vectorIndex";

// Mock LLM client
const mockEmbed = jest.fn<(text: string) => Promise<number[]>>();
jest.mock("~/server/services/llm/client", () => ({
  getLLMClient: jest.fn(() => ({
    embed: (text: string) => mockEmbed(text),
    getProvider: jest.fn(() => "openai"),
  })),
}));

// Mock getCurrentDb to return our test database
const mockGetCurrentDb = jest.fn();
jest.mock("~/server/db", () => {
  const actual = jest.requireActual("~/server/db") as Record<string, unknown>;
  return {
    ...actual,
    getCurrentDb: () => mockGetCurrentDb(),
  };
});

describe("vectorSearch", () => {
  let testDb: DatabaseInstance;

  beforeEach(async () => {
    resetVectorIndex();
    jest.clearAllMocks();
    testDb = createTestDb();
    await migrateTestDb(testDb);
    mockGetCurrentDb.mockReturnValue(testDb);
    
    // Default mock: return a deterministic embedding
    const embeddingBuffer = createDeterministicEmbedding("default");
    const embeddingArray = Array.from(new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.byteLength / 4));
    mockEmbed.mockResolvedValue(embeddingArray);
  });

  describe("getOrCreateEmbedding", () => {
    it("should return existing embedding from database", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const embeddingBuffer = createDeterministicEmbedding("test text");
      const testEmbedding = createTestEmbedding({
        conceptId: testConcept.id!,
        embedding: embeddingBuffer,
        model: "text-embedding-3-small",
      });
      await testDb.insert(conceptEmbedding).values(testEmbedding);

      const result = await getOrCreateEmbedding(testConcept.id!, "test text", "text-embedding-3-small");

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockEmbed).not.toHaveBeenCalled(); // Should not call LLM if embedding exists
    });

    it("should generate new embedding if none exists", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const embeddingArray = Array.from(new Float32Array(createDeterministicEmbedding("new text").buffer, 0, 1536));
      mockEmbed.mockResolvedValue(embeddingArray);

      const result = await getOrCreateEmbedding(testConcept.id!, "new text", "text-embedding-3-small");

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockEmbed).toHaveBeenCalledWith("new text");
    });

    it("should handle binary embedding format", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const embeddingBuffer = createDeterministicEmbedding("test");
      const testEmbedding = createTestEmbedding({
        conceptId: testConcept.id!,
        embedding: embeddingBuffer,
        model: "text-embedding-3-small",
      });
      await testDb.insert(conceptEmbedding).values(testEmbedding);

      const result = await getOrCreateEmbedding(testConcept.id!, "test", "text-embedding-3-small");

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should update vector index when creating new embedding", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const embeddingArray = Array.from(new Float32Array(createDeterministicEmbedding("new").buffer, 0, 1536));
      mockEmbed.mockResolvedValue(embeddingArray);

      await getOrCreateEmbedding(testConcept.id!, "new", "text-embedding-3-small");

      // Verify embedding was stored in database
      const stored = await testDb
        .select()
        .from(conceptEmbedding)
        .where(eq(conceptEmbedding.conceptId, testConcept.id!));

      expect(stored.length).toBe(1);
    });
  });

  describe("findSimilarConcepts", () => {
    beforeEach(async () => {
      // Create multiple concepts with embeddings
      const concepts = [
        createTestConcept({ title: "Concept 1", content: "This is about machine learning" }),
        createTestConcept({ title: "Concept 2", content: "This is about artificial intelligence" }),
        createTestConcept({ title: "Concept 3", content: "This is about cooking recipes" }),
      ];
      await testDb.insert(concept).values(concepts);

      // Create embeddings for each
      for (let i = 0; i < concepts.length; i++) {
        const embeddingBuffer = createDeterministicEmbedding(`concept ${i + 1}`);
        const testEmbedding = createTestEmbedding({
          conceptId: concepts[i].id!,
          embedding: embeddingBuffer,
          model: "text-embedding-3-small",
        });
        await testDb.insert(conceptEmbedding).values(testEmbedding);
      }

      // Initialize vector index
      const { initializeVectorIndex } = await import("~/server/services/vectorIndex");
      await initializeVectorIndex();
    });

    it("should find similar concepts using vector search", async () => {
      const queryText = "machine learning algorithms";
      const embeddingArray = Array.from(new Float32Array(createDeterministicEmbedding(queryText).buffer, 0, 1536));
      mockEmbed.mockResolvedValue(embeddingArray);

      const results = await findSimilarConcepts(queryText, 5, 0.0, []);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should respect the limit parameter", async () => {
      const queryText = "test query";
      const embeddingArray = Array.from(new Float32Array(createDeterministicEmbedding(queryText).buffer, 0, 1536));
      mockEmbed.mockResolvedValue(embeddingArray);

      const results = await findSimilarConcepts(queryText, 2, 0.0, []);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should respect minSimilarity threshold", async () => {
      const queryText = "test query";
      const embeddingArray = Array.from(new Float32Array(createDeterministicEmbedding(queryText).buffer, 0, 1536));
      mockEmbed.mockResolvedValue(embeddingArray);

      const results = await findSimilarConcepts(queryText, 10, 0.9, []);

      results.forEach((result) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.9);
      });
    });

    it("should exclude specified concept IDs", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const queryText = "test query";
      const embeddingArray = Array.from(new Float32Array(createDeterministicEmbedding(queryText).buffer, 0, 1536));
      mockEmbed.mockResolvedValue(embeddingArray);

      const results = await findSimilarConcepts(queryText, 10, 0.0, [testConcept.id!]);

      expect(results.every((r) => r.conceptId !== testConcept.id!)).toBe(true);
    });
  });
});

