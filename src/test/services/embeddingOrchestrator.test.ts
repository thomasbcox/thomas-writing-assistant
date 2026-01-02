import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { createTestDb, migrateTestDb } from "../utils/db";
import { createTestConcept, createTestEmbedding, createDeterministicEmbedding } from "../utils/factories";
import { getEmbeddingStatus, checkAndGenerateMissing, generateEmbeddingForConcept } from "~/server/services/embeddingOrchestrator";
import type { DatabaseInstance } from "~/server/db";
import { concept, conceptEmbedding } from "~/server/schema";
import { resetVectorIndex } from "~/server/services/vectorIndex";

// Mock dependencies
const mockGenerateMissingEmbeddings = jest.fn<() => Promise<void>>();
const mockGetOrCreateEmbedding = jest.fn<(conceptId: string, text: string, model: string) => Promise<number[]>>();

jest.mock("~/server/services/vectorSearch", () => ({
  generateMissingEmbeddings: () => mockGenerateMissingEmbeddings(),
  getOrCreateEmbedding: (conceptId: string, text: string, model: string) => mockGetOrCreateEmbedding(conceptId, text, model),
}));

jest.mock("~/server/services/llm/client", () => ({
  getLLMClient: jest.fn(() => ({
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

describe("embeddingOrchestrator", () => {
  let testDb: DatabaseInstance;

  beforeEach(async () => {
    resetVectorIndex();
    jest.clearAllMocks();
    testDb = createTestDb();
    await migrateTestDb(testDb);
    mockGetCurrentDb.mockReturnValue(testDb);
    mockGenerateMissingEmbeddings.mockResolvedValue(undefined);
    // createDeterministicEmbedding returns Buffer, but getOrCreateEmbedding returns number[]
    // Mock getOrCreateEmbedding to return a number array
    const embeddingBuffer = createDeterministicEmbedding("test");
    const embeddingArray = Array.from(new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.byteLength / 4));
    mockGetOrCreateEmbedding.mockResolvedValue(embeddingArray);
  });

  describe("getEmbeddingStatus", () => {
    it("should return zero counts for empty database", async () => {
      const status = await getEmbeddingStatus();
      expect(status.totalConcepts).toBe(0);
      expect(status.conceptsWithEmbeddings).toBe(0);
      expect(status.conceptsWithoutEmbeddings).toBe(0);
      expect(status.isIndexing).toBe(false);
      expect(status.lastIndexedAt).toBeNull();
    });

    it("should count concepts with and without embeddings", async () => {
      // Create concepts
      const concept1 = createTestConcept();
      const concept2 = createTestConcept();
      const concept3 = createTestConcept();
      await testDb.insert(concept).values([concept1, concept2, concept3]);

      // Add embedding for one concept
      const embeddingBuffer = createDeterministicEmbedding("test");
      const testEmbedding = createTestEmbedding({
        conceptId: concept1.id!,
        embedding: embeddingBuffer,
        model: "text-embedding-3-small",
      });
      await testDb.insert(conceptEmbedding).values(testEmbedding);

      const status = await getEmbeddingStatus();
      expect(status.totalConcepts).toBe(3);
      expect(status.conceptsWithEmbeddings).toBe(1);
      expect(status.conceptsWithoutEmbeddings).toBe(2);
    });

    it("should return all concepts as having embeddings when all have embeddings", async () => {
      const concept1 = createTestConcept();
      const concept2 = createTestConcept();
      await testDb.insert(concept).values([concept1, concept2]);

      const embeddingBuffer = createDeterministicEmbedding("test");
      await testDb.insert(conceptEmbedding).values([
        createTestEmbedding({
          conceptId: concept1.id!,
          embedding: embeddingBuffer,
          model: "text-embedding-3-small",
        }),
        createTestEmbedding({
          conceptId: concept2.id!,
          embedding: embeddingBuffer,
          model: "text-embedding-3-small",
        }),
      ]);

      const status = await getEmbeddingStatus();
      expect(status.totalConcepts).toBe(2);
      expect(status.conceptsWithEmbeddings).toBe(2);
      expect(status.conceptsWithoutEmbeddings).toBe(0);
    });
  });

  describe("checkAndGenerateMissing", () => {
    it("should return early when all concepts have embeddings", async () => {
      const concept1 = createTestConcept();
      await testDb.insert(concept).values(concept1);

      const embeddingBuffer = createDeterministicEmbedding("test");
      await testDb.insert(conceptEmbedding).values(
        createTestEmbedding({
          conceptId: concept1.id!,
          embedding: embeddingBuffer,
          model: "text-embedding-3-small",
        }),
      );

      const progressCallback = jest.fn();
      await checkAndGenerateMissing(10, progressCallback);

      expect(mockGenerateMissingEmbeddings).not.toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          conceptsWithoutEmbeddings: 0,
        }),
      );
    });

    it("should generate embeddings for concepts without them", async () => {
      const concept1 = createTestConcept();
      const concept2 = createTestConcept();
      await testDb.insert(concept).values([concept1, concept2]);

      // Mock generateMissingEmbeddings to succeed
      mockGenerateMissingEmbeddings.mockResolvedValue(undefined);

      const progressCallback = jest.fn();
      await checkAndGenerateMissing(10, progressCallback);

      expect(mockGenerateMissingEmbeddings).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalled();
    });

    it("should retry on transient failures", async () => {
      const concept1 = createTestConcept();
      await testDb.insert(concept).values(concept1);

      // Mock generateMissingEmbeddings to fail twice then succeed
      let callCount = 0;
      mockGenerateMissingEmbeddings.mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error("Transient error");
        }
        return undefined;
      });

      // Use a small batch size and short delay for testing
      await checkAndGenerateMissing(1, undefined);

      // Should have been called multiple times due to retries
      expect(mockGenerateMissingEmbeddings.mock.calls.length).toBeGreaterThan(1);
    });

    it("should skip failed batches and continue", async () => {
      const concepts = Array.from({ length: 5 }, () => createTestConcept());
      await testDb.insert(concept).values(concepts);

      // Mock generateMissingEmbeddings to always fail
      mockGenerateMissingEmbeddings.mockRejectedValue(new Error("Persistent error"));

      // Should not throw, but should stop after all batches fail
      await expect(checkAndGenerateMissing(2)).resolves.not.toThrow();
    });

    it("should call progress callback with batch counts", async () => {
      const concepts = Array.from({ length: 3 }, () => createTestConcept());
      await testDb.insert(concept).values(concepts);

      mockGenerateMissingEmbeddings.mockResolvedValue(undefined);

      const progressCallback = jest.fn<(status: any) => void>();
      await checkAndGenerateMissing(2, progressCallback);

      // Progress callback should have been called
      expect(progressCallback).toHaveBeenCalled();
      
      // Check that progress includes batch information
      const progressCalls = progressCallback.mock.calls;
      if (progressCalls.length > 0) {
        const lastCall = progressCalls[progressCalls.length - 1][0];
        expect(lastCall).toHaveProperty("successfulBatches");
        expect(lastCall).toHaveProperty("failedBatches");
      }
    });
  });

  describe("generateEmbeddingForConcept", () => {
    it("should generate embedding for a specific concept", async () => {
      const testConcept = createTestConcept({
        title: "Test Title",
        description: "Test Description",
        content: "Test Content",
      });
      await testDb.insert(concept).values(testConcept);

      const embeddingBuffer = createDeterministicEmbedding("test");
      mockGetOrCreateEmbedding.mockResolvedValue(Array.from(new Float32Array(embeddingBuffer.buffer)));

      await generateEmbeddingForConcept(testConcept.id!);

      expect(mockGetOrCreateEmbedding).toHaveBeenCalledWith(
        testConcept.id!,
        expect.stringContaining("Test Title"),
        expect.any(String),
      );
    });

    it("should throw error if concept does not exist", async () => {
      await expect(generateEmbeddingForConcept("non-existent-id")).rejects.toThrow(
        "Concept non-existent-id not found",
      );
    });
  });
});

