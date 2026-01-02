import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { createTestDb, migrateTestDb } from "../utils/db";
import { createTestConcept, createTestEmbedding, createDeterministicEmbedding } from "../utils/factories";
import { getVectorIndex, resetVectorIndex, initializeVectorIndex } from "~/server/services/vectorIndex";
import type { DatabaseInstance } from "~/server/db";
import { concept, conceptEmbedding } from "~/server/schema";
import { eq } from "drizzle-orm";

// Mock getCurrentDb to return our test database
const mockGetCurrentDb = jest.fn();
jest.mock("~/server/db", () => {
  const actual = jest.requireActual("~/server/db") as Record<string, unknown>;
  return {
    ...actual,
    getCurrentDb: () => mockGetCurrentDb(),
  };
});

describe("vectorIndex", () => {
  let testDb: DatabaseInstance;

  beforeEach(async () => {
    resetVectorIndex();
    testDb = createTestDb();
    await migrateTestDb(testDb);
    mockGetCurrentDb.mockReturnValue(testDb);
  });

  describe("initialize", () => {
    it("should initialize empty index when no embeddings exist", async () => {
      const index = getVectorIndex();
      await index.initialize();
      expect(index.size()).toBe(0);
    });

    it("should load embeddings from database", async () => {
      // Create a concept and embedding
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const embeddingBuffer = createDeterministicEmbedding("test text");
      const testEmbedding = createTestEmbedding({
        conceptId: testConcept.id!,
        embedding: embeddingBuffer,
        model: "text-embedding-3-small",
      });
      await testDb.insert(conceptEmbedding).values(testEmbedding);

      const index = getVectorIndex();
      await index.initialize();
      expect(index.size()).toBe(1);
    });

    it("should handle binary embeddings correctly", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const embeddingBuffer = createDeterministicEmbedding("test text");
      const testEmbedding = createTestEmbedding({
        conceptId: testConcept.id!,
        embedding: embeddingBuffer,
        model: "text-embedding-3-small",
      });
      await testDb.insert(conceptEmbedding).values(testEmbedding);

      const index = getVectorIndex();
      await index.initialize();
      expect(index.size()).toBe(1);
    });

    it("should handle multiple embeddings", async () => {
      // Create multiple concepts and embeddings
      const concepts = [createTestConcept(), createTestConcept(), createTestConcept()];
      for (const c of concepts) {
        await testDb.insert(concept).values(c);
        const embeddingBuffer = createDeterministicEmbedding(`text for ${c.id}`);
        const testEmbedding = createTestEmbedding({
          conceptId: c.id!,
          embedding: embeddingBuffer,
          model: "text-embedding-3-small",
        });
        await testDb.insert(conceptEmbedding).values(testEmbedding);
      }

      const index = getVectorIndex();
      await index.initialize();
      expect(index.size()).toBe(3);
    });
  });

  describe("addEmbedding", () => {
    it("should add a new embedding to the index", () => {
      const index = getVectorIndex();
      const embeddingBuffer = createDeterministicEmbedding("test text");
      const embeddingArray = Array.from(new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.byteLength / 4));
      index.addEmbedding("concept-1", embeddingArray);
      expect(index.size()).toBe(1);
    });

    it("should update existing embedding when conceptId already exists", () => {
      const index = getVectorIndex();
      const embedding1Buffer = createDeterministicEmbedding("text 1");
      const embedding2Buffer = createDeterministicEmbedding("text 2");
      const embedding1 = Array.from(new Float32Array(embedding1Buffer.buffer, embedding1Buffer.byteOffset, embedding1Buffer.byteLength / 4));
      const embedding2 = Array.from(new Float32Array(embedding2Buffer.buffer, embedding2Buffer.byteOffset, embedding2Buffer.byteLength / 4));
      
      index.addEmbedding("concept-1", embedding1);
      expect(index.size()).toBe(1);
      
      index.addEmbedding("concept-1", embedding2);
      expect(index.size()).toBe(1); // Should still be 1, not 2
    });

    it("should pre-compute norms for faster similarity calculation", () => {
      const index = getVectorIndex();
      const embedding = [1, 2, 3];
      index.addEmbedding("concept-1", embedding);
      
      // Norm should be sqrt(1^2 + 2^2 + 3^2) = sqrt(14) ≈ 3.74
      const expectedNorm = Math.sqrt(1 + 4 + 9);
      
      // Search should work (indirectly tests norm is computed)
      const results = index.search(embedding, 1);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("removeEmbedding", () => {
    it("should remove an embedding from the index", () => {
      const index = getVectorIndex();
      const embeddingBuffer = createDeterministicEmbedding("test text");
      const embeddingArray = Array.from(new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.byteLength / 4));
      index.addEmbedding("concept-1", embeddingArray);
      expect(index.size()).toBe(1);
      
      index.removeEmbedding("concept-1");
      expect(index.size()).toBe(0);
    });

    it("should not error when removing non-existent embedding", () => {
      const index = getVectorIndex();
      expect(() => index.removeEmbedding("non-existent")).not.toThrow();
      expect(index.size()).toBe(0);
    });
  });

  describe("search", () => {
    beforeEach(() => {
      const index = getVectorIndex();
      // Add some test embeddings
      index.addEmbedding("concept-1", [1, 0, 0]);
      index.addEmbedding("concept-2", [0, 1, 0]);
      index.addEmbedding("concept-3", [0, 0, 1]);
    });

    it("should find similar vectors using cosine similarity", () => {
      const index = getVectorIndex();
      const query = [1, 0, 0]; // Should match concept-1
      const results = index.search(query, 1);
      
      expect(results.length).toBe(1);
      expect(results[0].conceptId).toBe("concept-1");
      expect(results[0].similarity).toBeCloseTo(1.0, 5); // Should be very similar
    });

    it("should respect the limit parameter", () => {
      const index = getVectorIndex();
      const query = [1, 1, 0]; // Similar to both concept-1 and concept-2
      const results = index.search(query, 1);
      
      expect(results.length).toBe(1);
    });

    it("should respect minSimilarity threshold", () => {
      const index = getVectorIndex();
      const query = [1, 0, 0];
      const results = index.search(query, 10, 0.9); // High threshold
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.similarity).toBeGreaterThanOrEqual(0.9);
      });
    });

    it("should exclude specified concept IDs", () => {
      const index = getVectorIndex();
      const query = [1, 0, 0];
      const results = index.search(query, 10, 0.0, ["concept-1"]);
      
      expect(results.every(r => r.conceptId !== "concept-1")).toBe(true);
    });

    it("should return results sorted by similarity (highest first)", () => {
      const index = getVectorIndex();
      const query = [1, 0.5, 0]; // Closer to concept-1 than concept-2
      const results = index.search(query, 10);
      
      expect(results.length).toBeGreaterThan(1);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it("should handle zero vectors gracefully", () => {
      const index = getVectorIndex();
      const query = [0, 0, 0];
      const results = index.search(query, 10);
      
      // Should not crash, but may return empty or low similarity results
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("size", () => {
    it("should return the number of entries in the index", () => {
      const index = getVectorIndex();
      expect(index.size()).toBe(0);
      
      index.addEmbedding("concept-1", [1, 2, 3]);
      expect(index.size()).toBe(1);
      
      index.addEmbedding("concept-2", [4, 5, 6]);
      expect(index.size()).toBe(2);
    });
  });

  describe("clear", () => {
    it("should clear all entries from the index", () => {
      const index = getVectorIndex();
      index.addEmbedding("concept-1", [1, 2, 3]);
      index.addEmbedding("concept-2", [4, 5, 6]);
      expect(index.size()).toBe(2);
      
      index.clear();
      expect(index.size()).toBe(0);
    });
  });
});

