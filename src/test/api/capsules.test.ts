/**
 * Tests for Capsules API routes
 * GET /api/capsules - List capsules
 * POST /api/capsules - Create capsule
 * GET /api/capsules/[id] - Get capsule by ID
 * PUT /api/capsules/[id] - Update capsule
 * DELETE /api/capsules/[id] - Delete capsule
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { GET, POST } from "~/app/api/capsules/route";
import { GET as getById } from "~/app/api/capsules/[id]/route";
import { NextRequest } from "next/server";

// Use jest.hoisted to create mock before jest.mock hoisting
// This allows us to create the mock before jest.mock() is hoisted
const { mockDb } = (jest as any).hoisted(() => {
  // Create mock structure inline (can't import in hoisted context)
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

describe("Capsules API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(mockDb.capsule.findMany).mockReset();
    jest.mocked(mockDb.capsule.findUnique).mockReset();
    jest.mocked(mockDb.capsule.create).mockReset();
    jest.mocked(mockDb.anchor.findMany).mockReset();
    jest.mocked(mockDb.repurposedContent.findMany).mockReset();
  });

  describe("GET /api/capsules", () => {
    it("should return list of capsules", async () => {
      const mockCapsules = [
        {
          id: "1",
          title: "Test Capsule",
          promise: "We promise to help",
          cta: "Get started",
          offerMapping: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.mocked(mockDb.capsule.findMany).mockResolvedValue(mockCapsules as any);
      jest.mocked(mockDb.anchor.findMany).mockResolvedValue([]);
      jest.mocked(mockDb.repurposedContent.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Test Capsule");
    });
  });

  describe("POST /api/capsules", () => {
    it("should create a capsule", async () => {
      const mockCapsule = {
        id: "1",
        title: "New Capsule",
        promise: "New promise",
        cta: "New CTA",
        offerMapping: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.mocked(mockDb.capsule.create).mockResolvedValue(mockCapsule as any);

      const request = new NextRequest("http://localhost/api/capsules", {
        method: "POST",
        body: JSON.stringify({
          title: "New Capsule",
          promise: "New promise",
          cta: "New CTA",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("New Capsule");
      expect(mockDb.capsule.create).toHaveBeenCalled();
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/capsules", {
        method: "POST",
        body: JSON.stringify({
          title: "", // Invalid: empty title
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/capsules/[id]", () => {
    it("should return a capsule by ID with anchors", async () => {
      const mockCapsule = {
        id: "1",
        title: "Test Capsule",
        promise: "Promise",
        cta: "CTA",
        offerMapping: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAnchors = [
        {
          id: "anchor-1",
          capsuleId: "1",
          title: "Anchor 1",
          content: "Content",
          painPoints: null,
          solutionSteps: null,
          proof: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.mocked(mockDb.capsule.findUnique).mockResolvedValue(mockCapsule as any);
      jest.mocked(mockDb.anchor.findMany).mockResolvedValue(mockAnchors as any);
      jest.mocked(mockDb.repurposedContent.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/capsules/1");
      const response = await getById(request, { params: Promise.resolve({ id: "1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("1");
      expect(data.anchors).toBeDefined();
      expect(Array.isArray(data.anchors)).toBe(true);
    });

    it("should return 404 if capsule not found", async () => {
      jest.mocked(mockDb.capsule.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/capsules/999");
      const response = await getById(request, { params: Promise.resolve({ id: "999" }) });

      expect(response.status).toBe(404);
    });
  });

  // Note: PUT and DELETE are not implemented in /api/capsules/[id]/route.ts
  // Only GET is available
});

