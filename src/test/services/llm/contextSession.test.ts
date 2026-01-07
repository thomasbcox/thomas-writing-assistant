import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  getOrCreateContextSession,
  getContextSession,
  updateContextSession,
  deleteContextSession,
  cleanupExpiredSessions,
  invalidateSessionsForConcepts,
  generateSessionKey,
  type ContextMessage,
} from "~/server/services/llm/contextSession";
import { createTestDb, migrateTestDb, closeTestDb } from "../../utils/db";
import type { DatabaseInstance } from "~/server/db";
import { contextSession } from "~/server/schema";
import { eq } from "drizzle-orm";

describe("contextSession", () => {
  let testDb: DatabaseInstance;

  beforeEach(async () => {
    testDb = createTestDb();
    await migrateTestDb(testDb);
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

      const session1 = await getOrCreateContextSession(
        testDb,
        "test-session",
        "openai",
        "gpt-4o-mini",
        messages1,
        ["concept-1"],
      );

      const session2 = await getOrCreateContextSession(
        testDb,
        "test-session",
        "openai",
        "gpt-4o-mini",
        messages2,
        ["concept-2"],
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

      await getOrCreateContextSession(
        testDb,
        "test-session",
        "openai",
        "gpt-4o-mini",
        messages1,
        ["concept-1"],
      );

      const session = await getOrCreateContextSession(
        testDb,
        "test-session",
        "openai",
        "gpt-4o-mini",
        messages2,
        ["concept-2"],
      );

      expect(session.messages).toHaveLength(2);
      expect(session.messages[0]).toEqual(messages1[0]);
      expect(session.messages[1]).toEqual(messages2[0]);
      expect(session.conceptIds).toEqual(["concept-1", "concept-2"]);
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

      await getOrCreateContextSession(
        testDb,
        "test-session",
        "openai",
        "gpt-4o-mini",
        messages,
      );

      const session = await getContextSession(testDb, "test-session");
      expect(session).toBeDefined();
      expect(session?.sessionKey).toBe("test-session");
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
        "session-with-concept-1",
        "openai",
        "gpt-4o-mini",
        [{ role: "user", content: "Test" }],
        ["concept-1", "concept-2"],
      );

      await getOrCreateContextSession(
        testDb,
        "session-without-concept-1",
        "openai",
        "gpt-4o-mini",
        [{ role: "user", content: "Test" }],
        ["concept-3"],
      );

      const deleted = await invalidateSessionsForConcepts(testDb, ["concept-1"]);

      expect(deleted).toBe(1);

      const session1 = await getContextSession(
        testDb,
        "session-with-concept-1",
      );
      expect(session1).toBeNull();

      const session2 = await getContextSession(
        testDb,
        "session-without-concept-1",
      );
      expect(session2).toBeDefined();
    });
  });
});

