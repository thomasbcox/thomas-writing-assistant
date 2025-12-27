/**
 * Tests for Repurposed Content API routes
 * POST /api/capsules/[id]/anchors/[anchorId]/repurposed - Create repurposed content
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { cleanupTestData } from "../test-utils";
import type { ReturnType } from "~/server/db";
import { capsule, anchor } from "~/server/schema";
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

describe("Repurposed Content API", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(testDb);
  });

  describe("POST /api/capsules/[id]/anchors/[anchorId]/repurposed", () => {
    it("should create repurposed content", async () => {
      const { POST } = await import("~/app/api/capsules/[id]/anchors/[anchorId]/repurposed/route");
      
      // Create test capsule and anchor in real database
      const [testCapsule] = await testDb.insert(capsule).values({
        title: "Test Capsule",
        promise: "Promise",
        cta: "CTA",
      }).returning();
      
      const [testAnchor] = await testDb.insert(anchor).values({
        capsuleId: testCapsule.id,
        title: "Test Anchor",
        content: "Content",
      }).returning();

      const request = new NextRequest(
        `http://localhost/api/capsules/${testCapsule.id}/anchors/${testAnchor.id}/repurposed`,
        {
          method: "POST",
          body: JSON.stringify({
            type: "social_post",
            content: "Content",
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: testCapsule.id, anchorId: testAnchor.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe("social_post");
      expect(data.content).toBe("Content");
      expect(data.anchorId).toBe(testAnchor.id);
    });

    it("should return 404 for non-existent anchor", async () => {
      const { POST } = await import("~/app/api/capsules/[id]/anchors/[anchorId]/repurposed/route");
      
      // Create test capsule but not anchor
      const [testCapsule] = await testDb.insert(capsule).values({
        title: "Test Capsule",
        promise: "Promise",
        cta: "CTA",
      }).returning();
      
      const nonExistentAnchorId = "non-existent-anchor-12345";

      const request = new NextRequest(
        `http://localhost/api/capsules/${testCapsule.id}/anchors/${nonExistentAnchorId}/repurposed`,
        {
          method: "POST",
          body: JSON.stringify({
            type: "social_post",
            content: "Content",
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: testCapsule.id, anchorId: nonExistentAnchorId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Anchor not found");
    });

    it("should validate required fields", async () => {
      const { POST } = await import("~/app/api/capsules/[id]/anchors/[anchorId]/repurposed/route");
      
      // Create test capsule and anchor
      const [testCapsule] = await testDb.insert(capsule).values({
        title: "Test Capsule",
        promise: "Promise",
        cta: "CTA",
      }).returning();
      
      const [testAnchor] = await testDb.insert(anchor).values({
        capsuleId: testCapsule.id,
        title: "Test Anchor",
        content: "Content",
      }).returning();

      const request = new NextRequest(
        `http://localhost/api/capsules/${testCapsule.id}/anchors/${testAnchor.id}/repurposed`,
        {
          method: "POST",
          body: JSON.stringify({
            // Missing required fields (type and content are required)
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: testCapsule.id, anchorId: testAnchor.id }),
      });
      expect(response.status).toBe(400);
    });
  });
});
