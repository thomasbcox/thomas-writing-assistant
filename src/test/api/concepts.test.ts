/**
 * Tests for Concepts API routes
 * GET /api/concepts - List concepts
 * POST /api/concepts - Create concept
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

describe("Concepts API", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(testDb);
  });

  describe("GET /api/concepts", () => {
    it("should return list of concepts", async () => {
      const { GET } = await import("~/app/api/concepts/route");
      
      // Create test data in real database
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

      const request = new NextRequest("http://localhost/api/concepts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Test Concept");
      expect(data[0].id).toBe(testConcept.id);
    });

    it("should filter by search query", async () => {
      const { GET } = await import("~/app/api/concepts/route");
      
      // Create test concepts
      await testDb.insert(concept).values({
        identifier: "zettel-1",
        title: "Test Concept",
        description: "Test description",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
      });
      
      await testDb.insert(concept).values({
        identifier: "zettel-2",
        title: "Other Concept",
        description: "Other description",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
      });

      const request = new NextRequest("http://localhost/api/concepts?search=Test");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Test Concept");
    });

    it("should include trash when includeTrash=true", async () => {
      const { GET } = await import("~/app/api/concepts/route");
      
      // Create active and trashed concepts
      await testDb.insert(concept).values({
        identifier: "zettel-active",
        title: "Active Concept",
        description: "Test",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
      });
      
      await testDb.insert(concept).values({
        identifier: "zettel-trashed",
        title: "Trashed Concept",
        description: "Test",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "trashed",
      });

      const request = new NextRequest("http://localhost/api/concepts?includeTrash=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBeGreaterThanOrEqual(2);
      const titles = data.map((c: any) => c.title);
      expect(titles).toContain("Active Concept");
      expect(titles).toContain("Trashed Concept");
    });
  });

  describe("POST /api/concepts", () => {
    it("should create a new concept", async () => {
      const { POST } = await import("~/app/api/concepts/route");

      const request = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          title: "New Concept",
          description: "Description",
          content: "Content",
          creator: "Author",
          source: "Source",
          year: "2024",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("New Concept");
      expect(data.description).toBe("Description");
      expect(data.content).toBe("Content");
      expect(data.creator).toBe("Author");
      expect(data.source).toBe("Source");
      expect(data.year).toBe("2024");
      expect(data.status).toBe("active");
      expect(data.identifier).toMatch(/^zettel-/);
      
      // Verify it was actually created in the database
      const created = await testDb.query.concept.findFirst({
        where: (concept, { eq }) => eq(concept.id, data.id),
      });
      expect(created).toBeDefined();
      expect(created?.title).toBe("New Concept");
    });

    it("should validate required fields", async () => {
      const { POST } = await import("~/app/api/concepts/route");
      
      const request = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields (title and content are required)
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
