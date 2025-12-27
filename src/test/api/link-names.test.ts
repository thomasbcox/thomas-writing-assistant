/**
 * Tests for Link Names API routes
 * GET /api/link-names - List all link names
 * POST /api/link-names - Create link name
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { cleanupTestData } from "../test-utils";
import type { ReturnType } from "~/server/db";
import { linkName } from "~/server/schema";
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

describe("Link Names API", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(testDb);
  });

  describe("GET /api/link-names", () => {
    it("should return list of link names", async () => {
      const { GET } = await import("~/app/api/link-names/route");
      
      // Note: This route is deprecated and returns empty array
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      // Route returns empty array (deprecated)
      expect(data).toEqual([]);
    });
  });

  describe("POST /api/link-names", () => {
    it("should create a new link name", async () => {
      const { POST } = await import("~/app/api/link-names/route");
      
      // Use a unique name that won't conflict with default link names
      const uniqueName = `test-relationship-${Date.now()}`;
      
      const request = new NextRequest("http://localhost/api/link-names", {
        method: "POST",
        body: JSON.stringify({
          name: uniqueName,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.forwardName).toBe(uniqueName);
      expect(data.reverseName).toBe(uniqueName);
      expect(data.isSymmetric).toBe(true);
      expect(data.isDefault).toBe(false);
      
      // Verify link name was actually created in database
      const createdLinkName = await testDb.query.linkName.findFirst({
        where: eq(linkName.forwardName, uniqueName),
      });
      expect(createdLinkName).toBeDefined();
      expect(createdLinkName?.id).toBe(data.id);
    });

    it("should return existing link name if already exists", async () => {
      const { POST } = await import("~/app/api/link-names/route");
      
      // Use a unique name to avoid conflicts
      const existingName = `existing-name-${Date.now()}`;
      
      // Create existing link name
      const [existingLinkName] = await testDb.insert(linkName).values({
        forwardName: existingName,
        reverseName: existingName,
        isSymmetric: true,
        isDefault: false,
        isDeleted: false,
      }).returning();

      const request = new NextRequest("http://localhost/api/link-names", {
        method: "POST",
        body: JSON.stringify({
          name: existingName,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(existingLinkName.id);
      expect(data.forwardName).toBe(existingName);
    });

    it("should reject empty link name", async () => {
      const { POST } = await import("~/app/api/link-names/route");
      
      const request = new NextRequest("http://localhost/api/link-names", {
        method: "POST",
        body: JSON.stringify({
          name: "   ",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
