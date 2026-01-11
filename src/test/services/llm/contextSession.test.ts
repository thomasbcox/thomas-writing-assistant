import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  getOrCreateContextSession,
  getContextSession,
  updateContextSession,
  deleteContextSession,
  cleanupExpiredSessions,
  invalidateSessionsForConcepts,
  generateSessionKey,
  createCacheForSession,
  type ContextMessage,
} from "~/server/services/llm/contextSession";
import { createTestDb, migrateTestDb, closeTestDb } from "../../utils/db";
import type { DatabaseInstance } from "~/server/db";
import { contextSession } from "~/server/schema";
import { eq } from "drizzle-orm";
import { LLMClient } from "~/server/services/llm/client";

describe("contextSession", () => {
  let testDb: DatabaseInstance;

  beforeEach(async () => {
    testDb = createTestDb();
    await migrateTestDb(testDb);
    // Clean up any leftover sessions from previous tests
    await cleanupExpiredSessions(testDb);
  });

  afterEach(async () => {
    await closeTestDb(testDb);
  });

  describe("generateSessionKey", () => {
    it("should generate a session key from operation and concept ID", () => {
      const key = generateSessionKey("link-proposer", "concept-123");
      expect(key).toBe("link-proposer:concept-123");
    });

    it("should generate a session key with additional key", () => {
      const key = generateSessionKey("link-proposer", "concept-123", "batch-1");
      expect(key).toBe("link-proposer:concept-123:batch-1");
    });
  });

  describe("getOrCreateContextSession", () => {
    it("should create a new context session", async () => {
      const messages: ContextMessage[] = [
        { role: "user", content: "Test context" },
      ];
      const conceptIds = ["concept-1", "concept-2"];

      const session = await getOrCreateContextSession(
        testDb,
        "test-session",
        "openai",
        "gpt-4o-mini",
        messages,
        conceptIds,
      );

      expect(session).toBeDefined();
      expect(session.sessionKey).toBe("test-session");
      expect(session.provider).toBe("openai");
      expect(session.model).toBe("gpt-4o-mini");
      expect(session.messages).toEqual(messages);
      expect(session.conceptIds).toEqual(conceptIds);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should return existing session if not expired", async () => {
      const messages1: ContextMessage[] = [
        { role: "user", content: "First context" },
      ];
      const messages2: ContextMessage[] = [
        { role: "user", content: "Second context" },
      ];

      const sessionKey = `test-session-existing-${Date.now()}`;

      // Create first session with a long TTL to avoid expiration
      const session1 = await getOrCreateContextSession(
        testDb,
        sessionKey,
        "openai",
        "gpt-4o-mini",
        messages1,
        ["concept-1"],
        3600000, // 1 hour TTL
      );

      // Verify session was created
      expect(session1).toBeDefined();
      expect(session1.sessionKey).toBe(sessionKey);

      // Verify session exists in database
      const verifySession = await getContextSession(testDb, sessionKey);
      expect(verifySession).toBeDefined();
      expect(verifySession?.id).toBe(session1.id);

      // Get second session - should reuse the existing one
      const session2 = await getOrCreateContextSession(
        testDb,
        sessionKey,
        "openai",
        "gpt-4o-mini",
        messages2,
        ["concept-2"],
        3600000, // 1 hour TTL
      );

      expect(session2.id).toBe(session1.id);
      expect(session2.messages).toHaveLength(2);
      expect(session2.conceptIds).toEqual(["concept-1", "concept-2"]);
    });

    it("should merge messages and concept IDs", async () => {
      const messages1: ContextMessage[] = [
        { role: "user", content: "First" },
      ];
      const messages2: ContextMessage[] = [
        { role: "assistant", content: "Response" },
      ];

      const sessionKey = `test-session-merge-${Date.now()}`;

      const session1 = await getOrCreateContextSession(
        testDb,
        sessionKey,
        "openai",
        "gpt-4o-mini",
        messages1,
        ["concept-1"],
        3600000, // 1 hour TTL
      );

      // Verify first session was created
      expect(session1).toBeDefined();
      expect(session1.messages).toHaveLength(1);

      // Verify session exists in database
      const verifySession = await getContextSession(testDb, sessionKey);
      expect(verifySession).toBeDefined();

      const session = await getOrCreateContextSession(
        testDb,
        sessionKey,
        "openai",
        "gpt-4o-mini",
        messages2,
        ["concept-2"],
        3600000, // 1 hour TTL
      );

      expect(session.messages).toHaveLength(2);
      expect(session.messages[0]).toEqual(messages1[0]);
      expect(session.messages[1]).toEqual(messages2[0]);
      expect(session.conceptIds).toEqual(["concept-1", "concept-2"]);
    });

    it("should automatically create cache for new Gemini sessions with large content", async () => {
      // Mock LLMClient with Gemini provider
      const mockGeminiProvider = {
        createContextCache: jest.fn<() => Promise<string>>().mockResolvedValue("cachedContents/auto-123"),
      };
      const mockLLMClient = {
        getProvider: jest.fn<() => "gemini">().mockReturnValue("gemini"),
        provider: mockGeminiProvider,
      } as unknown as LLMClient;

      const largeContent = "x".repeat(3000); // Large content (> 2000 chars)
      const messages: ContextMessage[] = [
        { role: "user", content: largeContent },
      ];

      const session = await getOrCreateContextSession(
        testDb,
        "test-session-auto-cache",
        "gemini",
        "gemini-1.5-flash",
        messages,
        [],
        undefined, // ttlMs - use default
        mockLLMClient, // Pass llmClient for automatic caching
      );

      expect(session).toBeDefined();
      
      // Wait for async cache creation to complete
      // Retry a few times since cache creation is fire-and-forget
      let updatedSession = await getContextSession(testDb, "test-session-auto-cache");
      let attempts = 0;
      while (!updatedSession?.externalCacheId && attempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        updatedSession = await getContextSession(testDb, "test-session-auto-cache");
        attempts++;
      }
      
      // Verify cache creation was attempted
      expect(mockGeminiProvider.createContextCache).toHaveBeenCalled();
      
      // Verify cache was stored in database
      expect(updatedSession?.externalCacheId).toBe("cachedContents/auto-123");
    });

    it("should not create cache for small content", async () => {
      const mockLLMClient = {
        getProvider: jest.fn().mockReturnValue("gemini"),
      } as unknown as LLMClient;

      const smallContent = "small"; // Less than 2000 chars
      const messages: ContextMessage[] = [
        { role: "user", content: smallContent },
      ];

      await getOrCreateContextSession(
        testDb,
        "test-session-no-cache",
        "gemini",
        "gemini-1.5-flash",
        messages,
        [],
        undefined,
        mockLLMClient,
      );

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // Verify no cache was created (no mock provider means no createContextCache call)
      const session = await getContextSession(testDb, "test-session-no-cache");
      expect(session?.externalCacheId).toBeUndefined();
    });

    it("should not create cache for non-Gemini provider", async () => {
      const mockLLMClient = {
        getProvider: jest.fn().mockReturnValue("openai"),
      } as unknown as LLMClient;

      const largeContent = "x".repeat(3000);
      const messages: ContextMessage[] = [
        { role: "user", content: largeContent },
      ];

      await getOrCreateContextSession(
        testDb,
        "test-session-openai",
        "openai",
        "gpt-4o-mini",
        messages,
        [],
        undefined,
        mockLLMClient,
      );

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // Verify no cache was created
      const session = await getContextSession(testDb, "test-session-openai");
      expect(session?.externalCacheId).toBeUndefined();
    });
  });

  describe("getContextSession", () => {
    it("should return null for non-existent session", async () => {
      const session = await getContextSession(testDb, "non-existent");
      expect(session).toBeNull();
    });

    it("should return existing session", async () => {
      const messages: ContextMessage[] = [
        { role: "user", content: "Test" },
      ];

      const created = await getOrCreateContextSession(
        testDb,
        "test-session-get-unique",
        "openai",
        "gpt-4o-mini",
        messages,
        [],
        3600000, // 1 hour TTL
      );

      // Small delay to ensure session is committed
      await new Promise((resolve) => setTimeout(resolve, 10));

      const session = await getContextSession(testDb, "test-session-get-unique");
      expect(session).toBeDefined();
      expect(session?.sessionKey).toBe("test-session-get-unique");
      expect(session?.id).toBe(created.id);
    });

    it("should return null for expired session", async () => {
      const messages: ContextMessage[] = [
        { role: "user", content: "Test" },
      ];

      // Create session with very short TTL
      await getOrCreateContextSession(
        testDb,
        "test-session",
        "openai",
        "gpt-4o-mini",
        messages,
        [],
        1, // 1ms TTL
      );

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const session = await getContextSession(testDb, "test-session");
      expect(session).toBeNull();
    });
  });

  describe("updateContextSession", () => {
    it("should update session with new messages", async () => {
      const messages1: ContextMessage[] = [
        { role: "user", content: "First" },
      ];
      const messages2: ContextMessage[] = [
        { role: "assistant", content: "Response" },
      ];

      await getOrCreateContextSession(
        testDb,
        "test-session",
        "openai",
        "gpt-4o-mini",
        messages1,
      );

      const updated = await updateContextSession(
        testDb,
        "test-session",
        messages2,
      );

      expect(updated).toBeDefined();
      expect(updated?.messages).toHaveLength(2);
    });

    it("should return null for non-existent session", async () => {
      const updated = await updateContextSession(
        testDb,
        "non-existent",
        [{ role: "user", content: "Test" }],
      );
      expect(updated).toBeNull();
    });
  });

  describe("deleteContextSession", () => {
    it("should delete a session", async () => {
      await getOrCreateContextSession(
        testDb,
        "test-session",
        "openai",
        "gpt-4o-mini",
        [{ role: "user", content: "Test" }],
      );

      await deleteContextSession(testDb, "test-session");

      const session = await getContextSession(testDb, "test-session");
      expect(session).toBeNull();
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("should delete expired sessions", async () => {
      // Create expired session
      await getOrCreateContextSession(
        testDb,
        "expired-session",
        "openai",
        "gpt-4o-mini",
        [{ role: "user", content: "Test" }],
        [], // conceptIds
        1, // 1ms TTL
      );

      // Create non-expired session
      await getOrCreateContextSession(
        testDb,
        "active-session",
        "openai",
        "gpt-4o-mini",
        [{ role: "user", content: "Test" }],
        [], // conceptIds
        60000, // 1 minute TTL
      );

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const deleted = await cleanupExpiredSessions(testDb);
      expect(deleted).toBeGreaterThan(0);

      const expired = await getContextSession(testDb, "expired-session");
      expect(expired).toBeNull();

      const active = await getContextSession(testDb, "active-session");
      expect(active).toBeDefined();
    });
  });

  describe("invalidateSessionsForConcepts", () => {
    it("should invalidate sessions containing specified concepts", async () => {
      await getOrCreateContextSession(
        testDb,
        "session-with-concept-1-unique",
        "openai",
        "gpt-4o-mini",
        [{ role: "user", content: "Test" }],
        ["concept-1", "concept-2"],
        3600000, // 1 hour TTL
      );

      await getOrCreateContextSession(
        testDb,
        "session-without-concept-1-unique",
        "openai",
        "gpt-4o-mini",
        [{ role: "user", content: "Test" }],
        ["concept-3"],
        3600000, // 1 hour TTL
      );

      // Small delay to ensure sessions are committed
      await new Promise((resolve) => setTimeout(resolve, 10));

      const deleted = await invalidateSessionsForConcepts(testDb, ["concept-1"]);

      expect(deleted).toBe(1);

      const session1 = await getContextSession(
        testDb,
        "session-with-concept-1-unique",
      );
      expect(session1).toBeNull();

      const session2 = await getContextSession(
        testDb,
        "session-without-concept-1-unique",
      );
      expect(session2).toBeDefined();
    });
  });

  describe("createCacheForSession", () => {
    it("should create cache for large content with Gemini provider", async () => {
      // First create a session
      const messages: ContextMessage[] = [
        { role: "user", content: "Test context" },
      ];
      await getOrCreateContextSession(
        testDb,
        "test-session-cache-unique",
        "gemini",
        "gemini-1.5-flash",
        messages,
        [],
        3600000, // 1 hour TTL
      );

      // Mock LLMClient with Gemini provider
      const mockGeminiProvider = {
        createContextCache: jest.fn<() => Promise<string>>().mockResolvedValue("cachedContents/test-123"),
      };
      const mockLLMClient = {
        getProvider: jest.fn<() => "gemini">().mockReturnValue("gemini"),
        provider: mockGeminiProvider,
      } as unknown as LLMClient;

      const largeContent = "x".repeat(3000); // Large content
      const cacheId = await createCacheForSession(
        testDb,
        "test-session-cache-unique",
        "gemini",
        largeContent,
        mockLLMClient
      );

      expect(mockGeminiProvider.createContextCache).toHaveBeenCalled();
      expect(cacheId).toBe("cachedContents/test-123");

      // Verify cache was stored in database
      // Small delay to ensure database update is committed
      await new Promise((resolve) => setTimeout(resolve, 50));
      const session = await getContextSession(testDb, "test-session-cache-unique");
      expect(session).toBeDefined();
      expect(session?.externalCacheId).toBe("cachedContents/test-123");
    });

    it("should not create cache for small content", async () => {
      const mockLLMClient = {
        getProvider: jest.fn().mockReturnValue("gemini"),
      } as unknown as LLMClient;

      const smallContent = "small"; // Less than 2000 chars
      const cacheId = await createCacheForSession(
        testDb,
        "test-session",
        "gemini",
        smallContent,
        mockLLMClient
      );

      expect(cacheId).toBeNull();
    });

    it("should not create cache for non-Gemini provider", async () => {
      const mockLLMClient = {
        getProvider: jest.fn().mockReturnValue("openai"),
      } as unknown as LLMClient;

      const largeContent = "x".repeat(3000);
      const cacheId = await createCacheForSession(
        testDb,
        "test-session",
        "openai",
        largeContent,
        mockLLMClient
      );

      expect(cacheId).toBeNull();
    });
  });

  describe("cleanupExpiredSessions with cache", () => {
    it("should delete expired caches when cleaning up sessions", async () => {
      // Create a session with cache
      const mockGeminiProvider = {
        createContextCache: jest.fn<() => Promise<string>>().mockResolvedValue("cachedContents/expired-123"),
        deleteCache: jest.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined),
      };
      const mockLLMClient = {
        getProvider: jest.fn<() => "gemini">().mockReturnValue("gemini"),
        provider: mockGeminiProvider,
      } as unknown as LLMClient;

      // Create session with past expiration
      const expiredDate = new Date(Date.now() - 1000);
      await testDb.insert(contextSession).values({
        id: "expired-session",
        sessionKey: "expired-session",
        provider: "gemini",
        model: "gemini-1.5-flash",
        contextMessages: JSON.stringify([]),
        conceptIds: null,
        externalCacheId: "cachedContents/expired-123",
        cacheExpiresAt: expiredDate,
        expiresAt: expiredDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deletedCount = await cleanupExpiredSessions(testDb, mockLLMClient);

      expect(deletedCount).toBe(1);
      expect(mockGeminiProvider.deleteCache).toHaveBeenCalledWith("cachedContents/expired-123");
    });
  });
});

