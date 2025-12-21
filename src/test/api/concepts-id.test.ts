/**
 * Tests for Concepts API routes - Individual concept endpoints
 * GET/PUT/DELETE /api/concepts/[id]
 */

import { describe, it, expect, jest, beforeEach, beforeAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { setupApiRouteMocks } from "./drizzle-mock-helper";

// Setup mocks (jest.mock is hoisted)
setupApiRouteMocks();

// Import route handler AFTER mocks are set up
import { GET, PUT, DELETE } from "~/app/api/concepts/[id]/route";

// Get mockDb reference after mocks are set up
let mockDb: ReturnType<typeof import("./drizzle-mock-helper").createDrizzleMockDb>;
beforeAll(async () => {
  const helpers = await import("~/server/api/helpers");
  mockDb = (helpers as any).__mockDb;
});

describe("Concepts API - Individual Concept Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb._setUpdateResult([]);
  });

  describe("GET /api/concepts/[id]", () => {
    it("should return concept by id", async () => {
      const mockConcept = {
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
        outgoingLinks: [],
        incomingLinks: [],
      };

      mockDb.query.concept.findFirst.mockResolvedValue(mockConcept);

      const request = new NextRequest("http://localhost/api/concepts/1");
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Test Concept");
      expect(mockDb.query.concept.findFirst).toHaveBeenCalled();
    });

    it("should return 404 for non-existent concept", async () => {
      mockDb.query.concept.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/concepts/999");
      const response = await GET(request, {
        params: Promise.resolve({ id: "999" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Concept not found");
    });
  });

  describe("PUT /api/concepts/[id]", () => {
    it("should update concept", async () => {
      const mockConcept = {
        id: "1",
        title: "Updated Concept",
        description: "Updated",
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

      // First check if concept exists
      mockDb.query.concept.findFirst.mockResolvedValue({ id: "1" });
      // Then return updated concept
      mockDb._setUpdateResult([mockConcept]);

      const request = new NextRequest("http://localhost/api/concepts/1", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Concept",
          description: "Updated",
        }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Concept");
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should return 404 for non-existent concept", async () => {
      mockDb.query.concept.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/concepts/999", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated",
        }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "999" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Concept not found");
    });
  });

  describe("DELETE /api/concepts/[id]", () => {
    it("should soft delete concept", async () => {
      const mockConcept = {
        id: "1",
        title: "Test Concept",
        status: "active",
      };

      // First check if concept exists
      mockDb.query.concept.findFirst.mockResolvedValue(mockConcept);
      // Then return updated concept with trashedAt
      mockDb._setUpdateResult([
        { ...mockConcept, status: "trash", trashedAt: new Date() },
      ]);

      const request = new NextRequest("http://localhost/api/concepts/1", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(200);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should return 404 for non-existent concept", async () => {
      mockDb.query.concept.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/concepts/999", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "999" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Concept not found");
    });
  });
});
