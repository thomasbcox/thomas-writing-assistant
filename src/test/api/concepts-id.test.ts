/**
 * Tests for Concepts API routes - Individual concept endpoints
 * GET/PUT/DELETE /api/concepts/[id]
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { cleanupTestData } from "../test-utils";
import type { ReturnType } from "~/server/db";
import { concept } from "~/server/schema";
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

describe("Concepts API - Individual Concept Endpoints", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(testDb);
  });

  describe("GET /api/concepts/[id]", () => {
    it("should return concept by id", async () => {
      const { GET } = await import("~/app/api/concepts/[id]/route");
      
      // Create test concept in real database
      const [testConcept] = await testDb.insert(concept).values({
        identifier: "zettel-123",
        title: "Test Concept",
        description: "Test",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
      }).returning();

      const request = new NextRequest(`http://localhost/api/concepts/${testConcept.id}`);
      const response = await GET(request, {
        params: Promise.resolve({ id: testConcept.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Test Concept");
      expect(data.id).toBe(testConcept.id);
    });

    it("should return 404 for non-existent concept", async () => {
      const { GET } = await import("~/app/api/concepts/[id]/route");
      
      const nonExistentId = "non-existent-id-12345";
      const request = new NextRequest(`http://localhost/api/concepts/${nonExistentId}`);
      const response = await GET(request, {
        params: Promise.resolve({ id: nonExistentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Concept not found");
    });
  });

  describe("PUT /api/concepts/[id]", () => {
    it("should update concept", async () => {
      const { PUT } = await import("~/app/api/concepts/[id]/route");
      
      // Create test concept in real database
      const [testConcept] = await testDb.insert(concept).values({
        identifier: "zettel-123",
        title: "Original Concept",
        description: "Original",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
      }).returning();

      const request = new NextRequest(`http://localhost/api/concepts/${testConcept.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Concept",
          description: "Updated",
        }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: testConcept.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Concept");
      expect(data.description).toBe("Updated");
      expect(data.id).toBe(testConcept.id);
      
      // Verify it was actually updated in the database
      const updated = await testDb.query.concept.findFirst({
        where: (concept, { eq }) => eq(concept.id, testConcept.id),
      });
      expect(updated?.title).toBe("Updated Concept");
      expect(updated?.description).toBe("Updated");
    });

    it("should return 404 for non-existent concept", async () => {
      const { PUT } = await import("~/app/api/concepts/[id]/route");
      
      const nonExistentId = "non-existent-id-12345";
      const request = new NextRequest(`http://localhost/api/concepts/${nonExistentId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated",
        }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: nonExistentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Concept not found");
    });
  });

  describe("DELETE /api/concepts/[id]", () => {
    it("should soft delete concept", async () => {
      const { DELETE } = await import("~/app/api/concepts/[id]/route");
      
      // Create test concept in real database
      const [testConcept] = await testDb.insert(concept).values({
        identifier: "zettel-123",
        title: "Test Concept",
        description: "Test",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
      }).returning();

      const request = new NextRequest(`http://localhost/api/concepts/${testConcept.id}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: testConcept.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify it was actually soft deleted in the database
      const deleted = await testDb.query.concept.findFirst({
        where: (concept, { eq }) => eq(concept.id, testConcept.id),
      });
      expect(deleted?.status).toBe("trash");
      expect(deleted?.trashedAt).toBeDefined();
    });

    it("should return 404 for non-existent concept", async () => {
      const { DELETE } = await import("~/app/api/concepts/[id]/route");
      
      const nonExistentId = "non-existent-id-12345";
      const request = new NextRequest(`http://localhost/api/concepts/${nonExistentId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: nonExistentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Concept not found");
    });
  });
});
