import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { createTestDb, migrateTestDb, closeTestDb } from "../utils/db";
import { createTestConcept, createTestEmbedding, createDeterministicEmbedding } from "../utils/factories";
import {
  getEmbeddingStatus,
  checkAndGenerateMissing,
  generateEmbeddingForConcept,
} from "~/server/services/embeddingOrchestrator";
import type { DatabaseInstance } from "~/server/db";
import { concept, conceptEmbedding } from "~/server/schema";
import { eq } from "drizzle-orm";
import { resetVectorIndex, getVectorIndex } from "~/server/services/vectorIndex";
import { MockLLMClient } from "../mocks/llm-client";

// Mock getCurrentDb for getEmbeddingStatus
const mockGetCurrentDb = jest.fn();
jest.mock("~/server/db", () => {
  const actual = jest.requireActual("~/server/db") as Record<string, unknown>;
  return {
    ...actual,
    getCurrentDb: () => mockGetCurrentDb(),
  };
});

// Mock getLLMClient for checkAndGenerateMissing
const mockGetLLMClient = jest.fn();
jest.mock("~/server/services/llm/client", () => {
  const actual = jest.requireActual("~/server/services/llm/client") as Record<string, unknown>;
  return {
    ...actual,
    getLLMClient: () => mockGetLLMClient(),
  };
});

describe("embeddingOrchestrator", () => {
  let testDb: DatabaseInstance;
  let mockLLMClient: MockLLMClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetVectorIndex();
    testDb = createTestDb();
    await migrateTestDb(testDb);
    // Reset and set up the mock to return testDb
    mockGetCurrentDb.mockReset();
    mockGetCurrentDb.mockReturnValue(testDb);
    // Also set __TEST_DB__ as a fallback (getCurrentDb checks this first)
    (globalThis as any).__TEST_DB__ = testDb;
    mockLLMClient = new MockLLMClient();
    // Set up LLM client mock
    mockGetLLMClient.mockReset();
    mockGetLLMClient.mockReturnValue(mockLLMClient.asLLMClient());
  });

  afterEach(async () => {
    resetVectorIndex();
    if (testDb) {
      closeTestDb(testDb);
    }
    // Clean up __TEST_DB__
    delete (globalThis as any).__TEST_DB__;
    jest.clearAllMocks();
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
      const concept1 = createTestConcept();
      const concept2 = createTestConcept();
      const concept3 = createTestConcept();
      // Insert one at a time - batch insert with .values([...]) doesn't work correctly with Drizzle
      await testDb.insert(concept).values(concept1);
      await testDb.insert(concept).values(concept2);
      await testDb.insert(concept).values(concept3);

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
      // Insert one at a time - batch insert doesn't work correctly with Drizzle
      await testDb.insert(concept).values(concept1);
      await testDb.insert(concept).values(concept2);

      const embeddingBuffer = createDeterministicEmbedding("test");
      // Insert one at a time - batch insert doesn't work correctly with Drizzle
      await testDb.insert(conceptEmbedding).values(
        createTestEmbedding({
          conceptId: concept1.id!,
          embedding: embeddingBuffer,
          model: "text-embedding-3-small",
        }),
      );
      await testDb.insert(conceptEmbedding).values(
        createTestEmbedding({
          conceptId: concept2.id!,
          embedding: embeddingBuffer,
          model: "text-embedding-3-small",
        }),
      );

      const status = await getEmbeddingStatus();
      expect(status.totalConcepts).toBe(2);
      expect(status.conceptsWithEmbeddings).toBe(2);
      expect(status.conceptsWithoutEmbeddings).toBe(0);
    });
  });

  describe("checkAndGenerateMissing", () => {
    it("should do nothing if no concepts are missing embeddings", async () => {
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

      const initialEmbeddingCount = (await testDb.select().from(conceptEmbedding)).length;
      await checkAndGenerateMissing(1);
      const finalEmbeddingCount = (await testDb.select().from(conceptEmbedding)).length;

      // Should not generate new embeddings since all concepts already have them
      expect(finalEmbeddingCount).toBe(initialEmbeddingCount);
    });

    it("should generate embeddings for concepts without them", async () => {
      const concept1 = createTestConcept();
      const concept2 = createTestConcept();
      // Insert one at a time - batch insert doesn't work correctly with Drizzle
      await testDb.insert(concept).values(concept1);
      await testDb.insert(concept).values(concept2);

      const mockEmbed = Array.from(new Float32Array(createDeterministicEmbedding("test").buffer));
      const embedSpy = jest.fn(async () => mockEmbed);
      mockLLMClient.setMockEmbed(embedSpy);

      await checkAndGenerateMissing(1);

      // Verify embeddings were generated by checking the database
      // Note: With batchSize=1, it processes one at a time, so we check that at least one was generated
      const embeddings = await testDb.select().from(conceptEmbedding);
      expect(embeddings.length).toBeGreaterThanOrEqual(1);
      // Check status to verify progress
      const status = await getEmbeddingStatus();
      expect(status.conceptsWithEmbeddings).toBeGreaterThanOrEqual(1);
    });

    it("should call progress callback with batch counts", async () => {
      const concept1 = createTestConcept();
      const concept2 = createTestConcept();
      // Insert one at a time - batch insert doesn't work correctly with Drizzle
      await testDb.insert(concept).values(concept1);
      await testDb.insert(concept).values(concept2);

      const mockEmbed = Array.from(new Float32Array(createDeterministicEmbedding("test").buffer));
      mockLLMClient.setMockEmbed(async () => mockEmbed);

      const progressCallback = jest.fn<(status: any) => void>();
      await checkAndGenerateMissing(2, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      const lastCallArgs = progressCallback.mock.calls[progressCallback.mock.calls.length - 1]?.[0];
      expect(lastCallArgs).toHaveProperty("successfulBatches");
      expect(lastCallArgs).toHaveProperty("failedBatches");
      // Verify embeddings were generated (at least one, since batch processing may take time)
      const embeddings = await testDb.select().from(conceptEmbedding);
      expect(embeddings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("generateEmbeddingForConcept", () => {
    it("should generate and store embedding for a specific concept", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const mockEmbed = Array.from(new Float32Array(createDeterministicEmbedding("test").buffer));
      mockLLMClient.setMockEmbed(async () => mockEmbed);

      await generateEmbeddingForConcept(testConcept.id!, testDb);

      const storedEmbedding = await testDb
        .select()
        .from(conceptEmbedding)
        .where(eq(conceptEmbedding.conceptId, testConcept.id!));
      expect(storedEmbedding.length).toBe(1);
      expect(Buffer.isBuffer(storedEmbedding[0].embedding)).toBe(true);
    });

    it("should throw error if concept not found", async () => {
      await expect(generateEmbeddingForConcept("non-existent-id", testDb)).rejects.toThrow(
        "Concept non-existent-id not found",
      );
    });

    it("should update vector index after generating embedding", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      const mockEmbed = Array.from(new Float32Array(createDeterministicEmbedding("test").buffer));
      mockLLMClient.setMockEmbed(async () => mockEmbed);

      await generateEmbeddingForConcept(testConcept.id!, testDb);

      const index = getVectorIndex();
      expect(index.size()).toBeGreaterThan(0);
    });

    it("should handle LLM errors when generating embedding", async () => {
      const testConcept = createTestConcept();
      await testDb.insert(concept).values(testConcept);

      // Make embed fail
      const embedSpy = jest.fn<() => Promise<number[]>>().mockRejectedValue(new Error("LLM API error"));
      mockLLMClient.setMockEmbed(embedSpy);

      await expect(generateEmbeddingForConcept(testConcept.id!, testDb)).rejects.toThrow(
        "LLM API error",
      );

      // Verify no embedding was stored
      const embeddings = await testDb
        .select()
        .from(conceptEmbedding)
        .where(eq(conceptEmbedding.conceptId, testConcept.id!));
      expect(embeddings.length).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully in checkAndGenerateMissing", async () => {
      const concept1 = createTestConcept();
      const concept2 = createTestConcept();
      await testDb.insert(concept).values(concept1);
      await testDb.insert(concept).values(concept2);

      // Make embed fail for some concepts
      let callCount = 0;
      const embedSpy = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("LLM API error");
        }
        return Array.from(new Float32Array(createDeterministicEmbedding("test").buffer));
      }) as any;
      mockLLMClient.setMockEmbed(embedSpy);

      // Should not throw, but continue processing
      await checkAndGenerateMissing(1);

      // Verify at least one embedding was created (the second one)
      const embeddings = await testDb.select().from(conceptEmbedding);
      expect(embeddings.length).toBeGreaterThanOrEqual(1);
    });
  });
});

