/**
 * Tests for Concepts API routes - Individual concept endpoints
 * GET/PUT/DELETE /api/concepts/[id]
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { GET, PUT, DELETE } from "~/app/api/concepts/[id]/route";
import { NextRequest } from "next/server";

// Use jest.hoisted to create mock before jest.mock hoisting
const { mockDb } = (jest as any).hoisted(() => {
  return {
    mockDb: {
      concept: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      link: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      linkName: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      capsule: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      anchor: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      repurposedContent: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      mRUConcept: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $disconnect: jest.fn(),
    },
  };
});

jest.mock("~/server/db", () => ({
  db: mockDb,
}));

describe("Concepts API - Individual Concept Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks
    jest.mocked(mockDb.concept.findUnique).mockReset();
    jest.mocked(mockDb.concept.update).mockReset();
  });

  describe("GET /api/concepts/[id]", () => {
    it("should return a concept by ID", async () => {
      const mockConcept = {
        id: "1",
        title: "Test Concept",
        description: "Test description",
        content: "Test content",
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

      jest.mocked(mockDb.concept.findUnique).mockResolvedValue(mockConcept as any);

      const request = new NextRequest("http://localhost/api/concepts/1");
      const response = await GET(request, { params: Promise.resolve({ id: "1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("1");
      expect(data.title).toBe("Test Concept");
      expect(mockDb.concept.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
        include: {
          outgoingLinks: {
            include: { target: true },
          },
          incomingLinks: {
            include: { source: true },
          },
        },
      });
    });

    it("should return 404 if concept not found", async () => {
      jest.mocked(mockDb.concept.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/concepts/999");
      const response = await GET(request, { params: Promise.resolve({ id: "999" }) });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/concepts/[id]", () => {
    it("should update a concept", async () => {
      const mockConcept = {
        id: "1",
        title: "Updated Concept",
        description: "Updated description",
        content: "Updated content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
        identifier: "zettel-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        trashedAt: null,
      };

      jest.mocked(mockDb.concept.update).mockResolvedValue(mockConcept as any);

      const request = new NextRequest("http://localhost/api/concepts/1", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Concept",
          description: "Updated description",
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Concept");
      expect(mockDb.concept.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: expect.objectContaining({
          title: "Updated Concept",
          description: "Updated description",
        }),
      });
    });

    it("should validate input", async () => {
      const request = new NextRequest("http://localhost/api/concepts/1", {
        method: "PUT",
        body: JSON.stringify({
          title: "", // Invalid: empty title when min(1) is required
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "1" }) });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/concepts/[id]", () => {
    it("should soft delete a concept", async () => {
      jest.mocked(mockDb.concept.update).mockResolvedValue({
        id: "1",
        status: "trash",
        trashedAt: new Date(),
      } as any);

      const request = new NextRequest("http://localhost/api/concepts/1", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.concept.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: {
          status: "trash",
          trashedAt: expect.any(Date),
        },
      });
    });
  });
});

