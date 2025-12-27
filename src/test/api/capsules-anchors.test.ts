/**
 * Tests for Capsule Anchors API routes
 * POST /api/capsules/[id]/anchors - Create anchor
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { cleanupTestData } from "../test-utils";
import type { ReturnType } from "~/server/db";
import { capsule, anchor } from "~/server/schema";
import { eq } from "drizzle-orm";
import { setupInMemoryDbMocks, initInMemoryDb, cleanupInMemoryDb } from "../utils/in-memory-db-setup";

// Setup mocks (must be before route imports)
setupInMemoryDbMocks();

type Database = ReturnType<typeof import("~/server/db").db>;

// Create test database - will be initialized in beforeAll
let testDb: Database;

beforeAll(async () => {
  testDb = await initInMemoryDb();
});

afterAll(() => {
  cleanupInMemoryDb();
});

describe("Capsule Anchors API", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(testDb);
  });

  describe("POST /api/capsules/[id]/anchors", () => {
    it("should create a new anchor", async () => {
      const { POST } = await import("~/app/api/capsules/[id]/anchors/route");
      
      // Create a test capsule
      const [testCapsule] = await testDb.insert(capsule).values({
        title: "Test Capsule",
        promise: "Test promise",
        cta: "Test CTA",
      }).returning();

      const request = new NextRequest(`http://localhost/api/capsules/${testCapsule.id}/anchors`, {
        method: "POST",
        body: JSON.stringify({
          title: "Test Anchor",
          content: "Content",
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testCapsule.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("Test Anchor");
      expect(data.content).toBe("Content");
      expect(data.capsuleId).toBe(testCapsule.id);
      
      // Verify anchor was actually created in database
      const createdAnchor = await testDb.query.anchor.findFirst({
        where: eq(anchor.capsuleId, testCapsule.id),
      });
      expect(createdAnchor).toBeDefined();
      expect(createdAnchor?.title).toBe("Test Anchor");
    });

    it("should return 404 for non-existent capsule", async () => {
      const { POST } = await import("~/app/api/capsules/[id]/anchors/route");
      
      const nonExistentId = "non-existent-id-12345";
      const request = new NextRequest(`http://localhost/api/capsules/${nonExistentId}/anchors`, {
        method: "POST",
        body: JSON.stringify({
          title: "Test Anchor",
          content: "Content",
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: nonExistentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Capsule not found");
    });

    it("should validate required fields", async () => {
      const { POST } = await import("~/app/api/capsules/[id]/anchors/route");
      
      // Create a test capsule
      const [testCapsule] = await testDb.insert(capsule).values({
        title: "Test Capsule",
        promise: "Test promise",
        cta: "Test CTA",
      }).returning();

      const request = new NextRequest(`http://localhost/api/capsules/${testCapsule.id}/anchors`, {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields (title and content are required)
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: testCapsule.id }),
      });
      expect(response.status).toBe(400);
    });
  });
});
