/**
 * Tests for Concepts API routes
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { GET, POST } from "~/app/api/concepts/route";
import { GET as getById, PUT, DELETE } from "~/app/api/concepts/[id]/route";
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

describe("Concepts API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      jest.mocked(mockDb.concept.findMany).mockResolvedValue(mockConcepts as any);

      const request = new NextRequest("http://localhost/api/concepts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Test Concept");
    });

    it("should filter by search query", async () => {
      jest.mocked(mockDb.concept.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/concepts?search=test");
      await GET(request);

      expect(mockDb.concept.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: "test" }) }),
            ]),
          }),
        }),
      );
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

      jest.mocked(mockDb.concept.create).mockResolvedValue(mockConcept as any);

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
      expect(mockDb.concept.create).toHaveBeenCalled();
    });
  });
});

