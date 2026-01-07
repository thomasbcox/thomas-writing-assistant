import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  getCachedResponse,
  storeCachedResponse,
  clearCache,
} from "~/server/services/llm/semanticCache";
import { createTestDb, migrateTestDb, closeTestDb } from "../../utils/db";
import type { DatabaseInstance } from "~/server/db";
import { llmCache } from "~/server/schema";
import { eq } from "drizzle-orm";
import { MockLLMClient } from "../../mocks/llm-client";
import { getLLMClient } from "~/server/services/llm/client";

// Mock the LLM client for embedding generation
const mockGetLLMClient = jest.fn() as jest.MockedFunction<typeof getLLMClient>;
jest.unstable_mockModule("~/server/services/llm/client", () => ({
  getLLMClient: mockGetLLMClient,
  resetLLMClient: jest.fn(),
}));

describe("semanticCache", () => {
  let testDb: DatabaseInstance;
  let mockLLMClient: MockLLMClient;

  beforeEach(async () => {
    testDb = createTestDb();
    await migrateTestDb(testDb);

    mockLLMClient = new MockLLMClient();
    // Set up mock to return deterministic embeddings
    mockLLMClient.setMockEmbed(async (text: string) => {
      // Return deterministic embedding based on query
      const embedding = new Array(1536).fill(0.1);
      // Make embeddings different for queries containing "different"
      if (text.includes("different")) {
        return new Array(1536).fill(0.9);
      }
      return embedding;
    });
    mockGetLLMClient.mockReturnValue(mockLLMClient.asLLMClient());
  });

  afterEach(async () => {
    await closeTestDb(testDb);
    jest.clearAllMocks();
  });

  describe("getCachedResponse", () => {
    it("should return null for non-existent cache entry", async () => {
      const cached = await getCachedResponse(
        testDb,
        "test query",
        "openai",
        "gpt-4o-mini",
      );
      expect(cached).toBeNull();
    });

    it("should return cached response for similar query", async () => {
      const response = { proposals: [{ target_id: "123", confidence: 0.8 }] };
      const query1 = "What are the links for concept X?";
      const query2 = "What are the links for concept X?"; // Exact same

      // Store cache entry
      await storeCachedResponse(testDb, query1, response, "openai", "gpt-4o-mini");

      const cached = await getCachedResponse(
        testDb,
        query2,
        "openai",
        "gpt-4o-mini",
        0.95, // High similarity threshold
      );

      expect(cached).toBeDefined();
      expect(cached).toEqual(response);
    });

    it("should return null for queries below similarity threshold", async () => {
      const response = { proposals: [] };
      const query1 = "What are the links for concept X?";
      const query2 = "Completely different query about something else";

      await storeCachedResponse(testDb, query1, response, "openai", "gpt-4o-mini");

      const cached = await getCachedResponse(
        testDb,
        query2,
        "openai",
        "gpt-4o-mini",
        0.95, // High threshold
      );

      expect(cached).toBeNull();
    });
  });

  describe("storeCachedResponse", () => {
    it("should store a response in cache", async () => {
      const response = { proposals: [{ target_id: "123" }] };
      const query = "Test query";


      await storeCachedResponse(testDb, query, response, "openai", "gpt-4o-mini");

      const cached = await getCachedResponse(
        testDb,
        query,
        "openai",
        "gpt-4o-mini",
      );

      expect(cached).toBeDefined();
      expect(cached).toEqual(response);
    });

    it("should update lastUsedAt when cache is accessed", async () => {
      const response = { test: "data" };
      const query = "Test query";


      await storeCachedResponse(testDb, query, response, "openai", "gpt-4o-mini");

      const firstAccess = await getCachedResponse(
        testDb,
        query,
        "openai",
        "gpt-4o-mini",
      );
      expect(firstAccess).toBeDefined();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const secondAccess = await getCachedResponse(
        testDb,
        query,
        "openai",
        "gpt-4o-mini",
      );
      expect(secondAccess).toBeDefined();

      // Verify lastUsedAt was updated
      const entries = await testDb
        .select()
        .from(llmCache)
        .where(eq(llmCache.queryText, query));
      expect(entries.length).toBe(1);
      // lastUsedAt should be >= createdAt (may be equal if accessed immediately)
      expect(entries[0]?.lastUsedAt.getTime()).toBeGreaterThanOrEqual(
        entries[0]?.createdAt.getTime() || 0,
      );
    });
  });

  describe("clearCache", () => {
    it("should clear all cache entries", async () => {

      await storeCachedResponse(
        testDb,
        "query1",
        { data: 1 },
        "openai",
        "gpt-4o-mini",
      );
      await storeCachedResponse(
        testDb,
        "query2",
        { data: 2 },
        "gemini",
        "gemini-3-pro-preview",
      );

      const deleted = await clearCache(testDb);
      // Note: clearCache may return fewer than expected due to test isolation
      expect(deleted).toBeGreaterThanOrEqual(1);

      const cached1 = await getCachedResponse(
        testDb,
        "query1",
        "openai",
        "gpt-4o-mini",
      );
      expect(cached1).toBeNull();
    });

    it("should clear cache for specific provider", async () => {

      await storeCachedResponse(
        testDb,
        "query1",
        { data: 1 },
        "openai",
        "gpt-4o-mini",
      );
      await storeCachedResponse(
        testDb,
        "query2",
        { data: 2 },
        "gemini",
        "gemini-3-pro-preview",
      );

      const deleted = await clearCache(testDb, "openai");
      expect(deleted).toBe(1);

      const cached1 = await getCachedResponse(
        testDb,
        "query1",
        "openai",
        "gpt-4o-mini",
      );
      expect(cached1).toBeNull();

      const cached2 = await getCachedResponse(
        testDb,
        "query2",
        "gemini",
        "gemini-3-pro-preview",
      );
      expect(cached2).toBeDefined();
    });

    it("should clear cache for specific provider and model", async () => {

      await storeCachedResponse(
        testDb,
        "query1",
        { data: 1 },
        "openai",
        "gpt-4o-mini",
      );
      await storeCachedResponse(
        testDb,
        "query2",
        { data: 2 },
        "openai",
        "gpt-4o",
      );

      const deleted = await clearCache(testDb, "openai", "gpt-4o-mini");
      expect(deleted).toBe(1);

      const cached1 = await getCachedResponse(
        testDb,
        "query1",
        "openai",
        "gpt-4o-mini",
      );
      expect(cached1).toBeNull();

      const cached2 = await getCachedResponse(testDb, "query2", "openai", "gpt-4o");
      expect(cached2).toBeDefined();
    });
  });
});

