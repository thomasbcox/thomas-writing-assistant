import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { createTestDb, migrateTestDb, closeTestDb } from "../utils/db";
import { createTestConcept, createTestEmbedding, createDeterministicEmbedding } from "../utils/factories";
import { getVectorIndex, resetVectorIndex } from "~/server/services/vectorIndex";
import type { DatabaseInstance } from "~/server/db";
import { concept, conceptEmbedding } from "~/server/schema";
import { eq } from "drizzle-orm";

describe("vectorIndex", () => {
  let testDb: DatabaseInstance;

  beforeEach(async () => {
    resetVectorIndex();
    testDb = createTestDb();
    await migrateTestDb(testDb);
  });

  afterEach(async () => {
    resetVectorIndex();
    if (testDb) {
      closeTestDb(testDb);
    }
  });

  describe("initialize", () => {
    it("should initialize empty index when no embeddings exist", async () => {
      const index = getVectorIndex();
      await index.initialize(testDb);
      expect(index.size()).toBe(0);
    });

    it("should load embeddings from database", async () => {
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
      await index.initialize(testDb);
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
      await index.initialize(testDb);
      expect(index.size()).toBe(1);
    });

    it("should handle multiple embeddings", async () => {
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
      await index.initialize(testDb);
      expect(index.size()).toBe(3);
    });
  });

  describe("addEmbedding", () => {
    it("should add a new embedding to the index", () => {
      const index = getVectorIndex();
      const embeddingBuffer = createDeterministicEmbedding("test text");
      const embeddingArray = Array.from(
        new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.byteLength / 4),
      );
      index.addEmbedding("concept-1", embeddingArray);
      expect(index.size()).toBe(1);
    });

    it("should update existing embedding when conceptId already exists", () => {
      const index = getVectorIndex();
      const embedding1Buffer = createDeterministicEmbedding("text 1");
      const embedding2Buffer = createDeterministicEmbedding("text 2");
      const embedding1 = Array.from(
        new Float32Array(embedding1Buffer.buffer, embedding1Buffer.byteOffset, embedding1Buffer.byteLength / 4),
      );
      const embedding2 = Array.from(
        new Float32Array(embedding2Buffer.buffer, embedding2Buffer.byteOffset, embedding2Buffer.byteLength / 4),
      );

      index.addEmbedding("concept-1", embedding1);
      expect(index.size()).toBe(1);

      index.addEmbedding("concept-1", embedding2);
      expect(index.size()).toBe(1);
    });

    it("should pre-compute norms for faster similarity calculation", () => {
      const index = getVectorIndex();
      const embedding = [1, 2, 3];
      index.addEmbedding("concept-1", embedding);

      const results = index.search(embedding, 1);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("removeEmbedding", () => {
    it("should remove an embedding from the index", () => {
      const index = getVectorIndex();
      const embeddingBuffer = createDeterministicEmbedding("test text");
      const embeddingArray = Array.from(
        new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.byteLength / 4),
      );
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
      index.addEmbedding("concept-1", [1, 0, 0]);
      index.addEmbedding("concept-2", [0, 1, 0]);
      index.addEmbedding("concept-3", [0, 0, 1]);
    });

    it("should find similar vectors using cosine similarity", () => {
      const index = getVectorIndex();
      const query = [1, 0, 0];
      const results = index.search(query, 1);

      expect(results.length).toBe(1);
      expect(results[0]?.conceptId).toBe("concept-1");
      expect(results[0]?.similarity).toBeCloseTo(1.0, 5);
    });

    it("should respect the limit parameter", () => {
      const index = getVectorIndex();
      const query = [1, 1, 0];
      const results = index.search(query, 1);

      expect(results.length).toBe(1);
    });

    it("should respect minSimilarity threshold", () => {
      const index = getVectorIndex();
      const query = [1, 0, 0];
      const results = index.search(query, 10, 0.9);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.similarity).toBeGreaterThanOrEqual(0.9);
      });
    });

    it("should exclude specified concept IDs", () => {
      const index = getVectorIndex();
      const query = [1, 0, 0];
      const results = index.search(query, 10, 0.0, ["concept-1"]);

      expect(results.every((r) => r.conceptId !== "concept-1")).toBe(true);
    });

    it("should return results sorted by similarity (highest first)", () => {
      const index = getVectorIndex();
      const query = [1, 0.5, 0];
      const results = index.search(query, 10);

      expect(results.length).toBeGreaterThan(1);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]?.similarity).toBeGreaterThanOrEqual(results[i]?.similarity || 0);
      }
    });

    it("should handle zero vectors gracefully", () => {
      const index = getVectorIndex();
      const query = [0, 0, 0];
      const results = index.search(query, 10);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("size", () => {
    it("should return the number of entries in the index", () => {
      const index = getVectorIndex();
      expect(index.size()).toBe(0);

      const embeddingBuffer = createDeterministicEmbedding("test");
      const embeddingArray = Array.from(
        new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.byteLength / 4),
      );
      index.addEmbedding("concept-1", embeddingArray);
      expect(index.size()).toBe(1);

      index.addEmbedding("concept-2", embeddingArray);
      expect(index.size()).toBe(2);
    });
  });

  describe("clear", () => {
    it("should clear all entries from the index", () => {
      const index = getVectorIndex();
      const embeddingBuffer = createDeterministicEmbedding("test");
      const embeddingArray = Array.from(
        new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.byteLength / 4),
      );
      index.addEmbedding("concept-1", embeddingArray);
      index.addEmbedding("concept-2", embeddingArray);
      expect(index.size()).toBe(2);

      index.clear();
      expect(index.size()).toBe(0);
    });
  });

  describe("initialize edge cases", () => {
    it("should handle legacy JSON string embeddings", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const legacyEmbedding = JSON.stringify([0.1, 0.2, 0.3, 0.4]);
      await testDb.insert(conceptEmbedding).values({
        id: "legacy-json-id",
        conceptId: testConcept.id!,
        embedding: legacyEmbedding as any, // Legacy JSON string format
        model: "legacy-model",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const index = getVectorIndex();
      await index.initialize(testDb);
      expect(index.size()).toBe(1);

      // Verify it can be searched
      const results = index.search([0.1, 0.2, 0.3, 0.4], 1);
      expect(results.length).toBe(1);
    });

    it("should skip embeddings with unknown format", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      // Insert embedding with unknown format (neither Buffer nor string)
      // Use a Buffer that's too small to be a valid embedding (simulates number conversion)
      // 4 bytes = 1 float dimension, which is less than the minimum of 4 dimensions (16 bytes)
      const invalidBuffer = Buffer.from([1, 2, 3, 4]); // 4 bytes = 1 float, too small
      await testDb.insert(conceptEmbedding).values({
        id: "unknown-format-id",
        conceptId: testConcept.id!,
        embedding: invalidBuffer,
        model: "test-model",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const index = getVectorIndex();
      await index.initialize(testDb);
      // Should skip the invalid embedding (too small - 4 bytes < 16 bytes minimum)
      // The validation should reject buffers smaller than 16 bytes
      // Also, even if it passes the size check, a 1-element vector should be rejected by the dimension check
      expect(index.size()).toBe(0);
    });

    it("should handle malformed JSON embeddings gracefully", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      await testDb.insert(conceptEmbedding).values({
        id: "malformed-json-id",
        conceptId: testConcept.id!,
        embedding: "not valid json" as any,
        model: "test-model",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const index = getVectorIndex();
      // Should not throw - error is caught and logged, embedding is skipped
      // The main goal is to verify graceful error handling (no crash)
      await expect(index.initialize(testDb)).resolves.not.toThrow();
      // Verify the index is in a valid state (can perform searches)
      const results = index.search([1, 2, 3], 10);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle empty embeddings array", async () => {
      const index = getVectorIndex();
      await index.initialize(testDb);
      expect(index.size()).toBe(0);

      const results = index.search([1, 2, 3], 10);
      expect(results.length).toBe(0);
    });
  });

  describe("search edge cases", () => {
    beforeEach(() => {
      const index = getVectorIndex();
      index.addEmbedding("concept-1", [1, 0, 0]);
      index.addEmbedding("concept-2", [0, 1, 0]);
      index.addEmbedding("concept-3", [0, 0, 1]);
    });

    it("should handle zero query norm (all zeros)", () => {
      const index = getVectorIndex();
      const query = [0, 0, 0];
      const results = index.search(query, 10);

      // Should return empty results since query norm is 0
      expect(results.length).toBe(0);
    });

    it("should handle zero embedding norm", () => {
      const index = getVectorIndex();
      index.addEmbedding("zero-norm", [0, 0, 0]);
      const query = [1, 0, 0];
      const results = index.search(query, 10);

      // Zero norm entries should be skipped
      expect(results.every((r) => r.conceptId !== "zero-norm")).toBe(true);
    });

    it("should handle mismatched embedding dimensions", () => {
      const index = getVectorIndex();
      index.addEmbedding("short-embedding", [1, 2]); // 2D
      const query = [1, 2, 3, 4]; // 4D

      const results = index.search(query, 10);
      // Should handle gracefully, only comparing up to min length
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle empty excludeConceptIds array", () => {
      const index = getVectorIndex();
      const query = [1, 0, 0];
      const results = index.search(query, 10, 0.0, []);

      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty array when no matches meet minSimilarity", () => {
      const index = getVectorIndex();
      const query = [1, 0, 0];
      const results = index.search(query, 10, 1.1); // Impossible threshold

      expect(results.length).toBe(0);
    });

    it("should handle all concepts excluded", () => {
      const index = getVectorIndex();
      const query = [1, 0, 0];
      const results = index.search(query, 10, 0.0, ["concept-1", "concept-2", "concept-3"]);

      expect(results.length).toBe(0);
    });
  });

  describe("addEmbedding edge cases", () => {
    it("should handle empty embedding array", () => {
      const index = getVectorIndex();
      index.addEmbedding("empty", []);
      expect(index.size()).toBe(1);

      // Should handle gracefully in search
      const results = index.search([1, 2, 3], 10);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle very large embeddings", () => {
      const index = getVectorIndex();
      const largeEmbedding = Array(1536).fill(0.1);
      index.addEmbedding("large", largeEmbedding);
      expect(index.size()).toBe(1);

      const results = index.search(largeEmbedding, 1);
      expect(results.length).toBe(1);
    });

    it("should update embedding when adding same conceptId multiple times", () => {
      const index = getVectorIndex();
      index.addEmbedding("concept-1", [1, 0, 0]);
      index.addEmbedding("concept-1", [0, 1, 0]);
      index.addEmbedding("concept-1", [0, 0, 1]);

      expect(index.size()).toBe(1);
      // Should have the last embedding
      const results = index.search([0, 0, 1], 1);
      expect(results[0]?.conceptId).toBe("concept-1");
    });
  });

  describe("removeEmbedding edge cases", () => {
    it("should handle removing from empty index", () => {
      const index = getVectorIndex();
      expect(() => index.removeEmbedding("any-id")).not.toThrow();
      expect(index.size()).toBe(0);
    });

    it("should handle removing same ID multiple times", () => {
      const index = getVectorIndex();
      index.addEmbedding("concept-1", [1, 2, 3]);
      index.removeEmbedding("concept-1");
      index.removeEmbedding("concept-1");
      expect(index.size()).toBe(0);
    });
  });

  describe("initializeVectorIndex", () => {
    it("should initialize index using getCurrentDb when no db provided", async () => {
      const index = getVectorIndex();
      // This will use getCurrentDb() internally
      await expect(index.initialize()).resolves.not.toThrow();
    });
  });
});

