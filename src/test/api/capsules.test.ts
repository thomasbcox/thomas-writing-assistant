/**
 * Tests for Capsules API routes
 * GET /api/capsules - List all capsules
 * POST /api/capsules - Create capsule
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { cleanupTestData } from "../test-utils";
import type { ReturnType } from "~/server/db";
import { capsule } from "~/server/schema";
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

describe("Capsules API", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(testDb);
  });

  describe("GET /api/capsules", () => {
    it("should return list of capsules", async () => {
      const { GET } = await import("~/app/api/capsules/route");
      
      // Create test capsule in real database
      const [testCapsule] = await testDb.insert(capsule).values({
        title: "Test Capsule",
        promise: "Promise",
        cta: "CTA",
        offerMapping: null,
      }).returning();

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Test Capsule");
      expect(data[0].id).toBe(testCapsule.id);
      expect(data[0].anchors).toEqual([]);
    });

    it("should return empty array when no capsules", async () => {
      const { GET } = await import("~/app/api/capsules/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("POST /api/capsules", () => {
    it("should create a new capsule", async () => {
      const { POST } = await import("~/app/api/capsules/route");

      const request = new NextRequest("http://localhost/api/capsules", {
        method: "POST",
        body: JSON.stringify({
          title: "New Capsule",
          promise: "Promise",
          cta: "CTA",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("New Capsule");
      expect(data.promise).toBe("Promise");
      expect(data.cta).toBe("CTA");
      
      // Verify it was actually created in the database
      const created = await testDb.query.capsule.findFirst({
        where: (capsule, { eq }) => eq(capsule.id, data.id),
      });
      expect(created).toBeDefined();
      expect(created?.title).toBe("New Capsule");
    });

    it("should validate required fields", async () => {
      const { POST } = await import("~/app/api/capsules/route");
      
      const request = new NextRequest("http://localhost/api/capsules", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields (title, promise, cta are required)
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
