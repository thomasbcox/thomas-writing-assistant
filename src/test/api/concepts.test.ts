/**
 * Tests for Concepts API routes
 * GET /api/concepts - List concepts
 * POST /api/concepts - Create concept
 */

import { describe, it, expect, jest, beforeEach, beforeAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { setupApiRouteMocks } from "./drizzle-mock-helper";

// Setup mocks (jest.mock is hoisted)
setupApiRouteMocks();

// Import route handler AFTER mocks are set up
import { GET, POST } from "~/app/api/concepts/route";

// Get mockDb reference after mocks are set up
let mockDb: ReturnType<typeof import("./drizzle-mock-helper").createDrizzleMockDb>;
beforeAll(async () => {
  const helpers = await import("~/server/api/helpers");
  mockDb = (helpers as any).__mockDb;
});

describe("Concepts API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb._setSelectResult([]);
    mockDb._setInsertResult([]);
  });

  describe("GET /api/concepts", () => {
    it("should return list of concepts", async () => {
      const mockConcepts = [
        {
          id: "1",
          title: "Test Concept",
          description: "Test",
          content: "Content",
          creator: "Author",
          source: "Source",
          year: "2024",
          status: "active",
          identifier: "zettel-123",
          createdAt: new Date(),
          updatedAt: new Date(),
          trashedAt: null,
        },
      ];

      mockDb._setSelectResult(mockConcepts);

      const request = new NextRequest("http://localhost/api/concepts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Test Concept");
      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter by search query", async () => {
      mockDb._setSelectResult([]);

      const request = new NextRequest("http://localhost/api/concepts?search=test");
      await GET(request);

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should include trash when includeTrash=true", async () => {
      mockDb._setSelectResult([]);

      const request = new NextRequest("http://localhost/api/concepts?includeTrash=true");
      await GET(request);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("POST /api/concepts", () => {
    it("should create a new concept", async () => {
      const mockConcept = {
        id: "1",
        title: "New Concept",
        description: "Description",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
        identifier: "zettel-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        trashedAt: null,
      };

      mockDb._setInsertResult([mockConcept]);

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
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
