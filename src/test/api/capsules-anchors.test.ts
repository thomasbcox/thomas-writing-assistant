/**
 * Tests for Capsule Anchors API routes
 * POST /api/capsules/[id]/anchors - Create anchor
 * PUT /api/capsules/[id]/anchors/[anchorId] - Update anchor
 * DELETE /api/capsules/[id]/anchors/[anchorId] - Delete anchor
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { POST as createAnchor } from "~/app/api/capsules/[id]/anchors/route";
import { PUT as updateAnchor, DELETE as deleteAnchor } from "~/app/api/capsules/[id]/anchors/[anchorId]/route";
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

describe("Capsule Anchors API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(mockDb.anchor.create).mockReset();
    jest.mocked(mockDb.anchor.update).mockReset();
    jest.mocked(mockDb.anchor.delete).mockReset();
    jest.mocked(mockDb.capsule.findUnique).mockReset();
  });

  describe("POST /api/capsules/[id]/anchors", () => {
    it("should create an anchor", async () => {
      const mockAnchor = {
        id: "anchor-1",
        capsuleId: "capsule-1",
        title: "Test Anchor",
        content: "Anchor content",
        painPoints: JSON.stringify(["Pain 1"]),
        solutionSteps: JSON.stringify(["Step 1"]),
        proof: "Proof text",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.mocked(mockDb.anchor.create).mockResolvedValue(mockAnchor as any);

      const request = new NextRequest("http://localhost/api/capsules/capsule-1/anchors", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Anchor",
          content: "Anchor content",
          painPoints: ["Pain 1"],
          solutionSteps: ["Step 1"],
          proof: "Proof text",
        }),
      });

      const response = await createAnchor(request, { params: Promise.resolve({ id: "capsule-1" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("Test Anchor");
      expect(mockDb.anchor.create).toHaveBeenCalledWith({
        data: {
          capsuleId: "capsule-1",
          title: "Test Anchor",
          content: "Anchor content",
          painPoints: JSON.stringify(["Pain 1"]),
          solutionSteps: JSON.stringify(["Step 1"]),
          proof: "Proof text",
        },
      });
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/capsules/capsule-1/anchors", {
        method: "POST",
        body: JSON.stringify({
          title: "", // Invalid: empty title
        }),
      });

      const response = await createAnchor(request, { params: Promise.resolve({ id: "capsule-1" }) });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/capsules/[id]/anchors/[anchorId]", () => {
    it("should update an anchor", async () => {
      const mockAnchor = {
        id: "anchor-1",
        capsuleId: "capsule-1",
        title: "Updated Anchor",
        content: "Updated content",
        painPoints: JSON.stringify(["Updated pain"]),
        solutionSteps: null,
        proof: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.mocked(mockDb.anchor.update).mockResolvedValue(mockAnchor as any);

      const request = new NextRequest("http://localhost/api/capsules/capsule-1/anchors/anchor-1", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Anchor",
          content: "Updated content",
          painPoints: ["Updated pain"],
        }),
      });

      const response = await updateAnchor(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Anchor");
      expect(mockDb.anchor.update).toHaveBeenCalledWith({
        where: { id: "anchor-1" },
        data: expect.objectContaining({
          title: "Updated Anchor",
          content: "Updated content",
          painPoints: JSON.stringify(["Updated pain"]),
        }),
      });
    });

    it("should validate input", async () => {
      const request = new NextRequest("http://localhost/api/capsules/capsule-1/anchors/anchor-1", {
        method: "PUT",
        body: JSON.stringify({
          title: "", // Invalid: empty title
        }),
      });

      const response = await updateAnchor(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1" }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/capsules/[id]/anchors/[anchorId]", () => {
    it("should delete an anchor", async () => {
      jest.mocked(mockDb.anchor.delete).mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost/api/capsules/capsule-1/anchors/anchor-1", {
        method: "DELETE",
      });

      const response = await deleteAnchor(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.anchor.delete).toHaveBeenCalledWith({
        where: { id: "anchor-1" },
      });
    });
  });
});
