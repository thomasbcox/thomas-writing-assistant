/**
 * Tests for Repurposed Content API routes
 * POST /api/capsules/[id]/anchors/[anchorId]/repurposed - Create repurposed content
 * PUT /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId] - Update repurposed content
 * DELETE /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId] - Delete repurposed content
 * POST /api/capsules/[id]/anchors/[anchorId]/repurposed/regenerate-all - Regenerate all repurposed content
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { POST as createRepurposed } from "~/app/api/capsules/[id]/anchors/[anchorId]/repurposed/route";
import { PUT as updateRepurposed, DELETE as deleteRepurposed } from "~/app/api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId]/route";
import { POST as regenerateAll } from "~/app/api/capsules/[id]/anchors/[anchorId]/repurposed/regenerate-all/route";
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
        deleteMany: jest.fn(),
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

// Mock repurposer service
jest.mock("~/server/services/repurposer", () => ({
  repurposeAnchorContent: jest.fn(),
}));

// Mock LLM client and config loader
jest.mock("~/server/services/llm/client", () => ({
  getLLMClient: jest.fn(() => ({
    completeJSON: jest.fn(),
    complete: jest.fn(),
  })),
}));

jest.mock("~/server/services/config", () => ({
  getConfigLoader: jest.fn(() => ({
    getSystemPrompt: jest.fn(() => "System prompt"),
  })),
}));

describe("Repurposed Content API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(mockDb.repurposedContent.create).mockReset();
    jest.mocked(mockDb.repurposedContent.update).mockReset();
    jest.mocked(mockDb.repurposedContent.delete).mockReset();
    jest.mocked(mockDb.repurposedContent.deleteMany).mockReset();
    jest.mocked(mockDb.anchor.findUnique).mockReset();
  });

  describe("POST /api/capsules/[id]/anchors/[anchorId]/repurposed", () => {
    it("should create repurposed content", async () => {
      const mockRepurposed = {
        id: "repurposed-1",
        anchorId: "anchor-1",
        type: "social_post",
        content: "Social media post content",
        guidance: "Post guidance",
        createdAt: new Date(),
      };

      jest.mocked(mockDb.repurposedContent.create).mockResolvedValue(mockRepurposed as any);

      const request = new NextRequest("http://localhost/api/capsules/capsule-1/anchors/anchor-1/repurposed", {
        method: "POST",
        body: JSON.stringify({
          type: "social_post",
          content: "Social media post content",
          guidance: "Post guidance",
        }),
      });

      const response = await createRepurposed(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe("social_post");
      expect(mockDb.repurposedContent.create).toHaveBeenCalledWith({
        data: {
          anchorId: "anchor-1",
          type: "social_post",
          content: "Social media post content",
          guidance: "Post guidance",
        },
      });
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/capsules/capsule-1/anchors/anchor-1/repurposed", {
        method: "POST",
        body: JSON.stringify({
          type: "", // Invalid: empty type
        }),
      });

      const response = await createRepurposed(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1" }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId]", () => {
    it("should update repurposed content", async () => {
      const mockRepurposed = {
        id: "repurposed-1",
        anchorId: "anchor-1",
        type: "email",
        content: "Updated email content",
        guidance: null,
        createdAt: new Date(),
      };

      jest.mocked(mockDb.repurposedContent.update).mockResolvedValue(mockRepurposed as any);

      const request = new NextRequest(
        "http://localhost/api/capsules/capsule-1/anchors/anchor-1/repurposed/repurposed-1",
        {
          method: "PUT",
          body: JSON.stringify({
            type: "email",
            content: "Updated email content",
            guidance: null,
          }),
        },
      );

      const response = await updateRepurposed(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1", repurposedId: "repurposed-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type).toBe("email");
      expect(mockDb.repurposedContent.update).toHaveBeenCalledWith({
        where: { id: "repurposed-1" },
        data: expect.objectContaining({
          type: "email",
          content: "Updated email content",
          guidance: null,
        }),
      });
    });
  });

  describe("DELETE /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId]", () => {
    it("should delete repurposed content", async () => {
      jest.mocked(mockDb.repurposedContent.delete).mockResolvedValue({} as any);

      const request = new NextRequest(
        "http://localhost/api/capsules/capsule-1/anchors/anchor-1/repurposed/repurposed-1",
        {
          method: "DELETE",
        },
      );

      const response = await deleteRepurposed(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1", repurposedId: "repurposed-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.repurposedContent.delete).toHaveBeenCalledWith({
        where: { id: "repurposed-1" },
      });
    });
  });

  describe("POST /api/capsules/[id]/anchors/[anchorId]/repurposed/regenerate-all", () => {
    it("should regenerate all repurposed content", async () => {
      const mockAnchor = {
        id: "anchor-1",
        capsuleId: "capsule-1",
        title: "Test Anchor",
        content: "Anchor content",
        painPoints: JSON.stringify(["Pain 1"]),
        solutionSteps: JSON.stringify(["Step 1"]),
        proof: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRepurposed = [
        {
          id: "repurposed-1",
          anchorId: "anchor-1",
          type: "social_post",
          content: "New social post",
          guidance: null,
          createdAt: new Date(),
        },
      ];

      jest.mocked(mockDb.anchor.findUnique).mockResolvedValue(mockAnchor as any);
      jest.mocked(mockDb.repurposedContent.deleteMany).mockResolvedValue({ count: 0 } as any);
      jest.mocked(mockDb.repurposedContent.create).mockResolvedValue(mockRepurposed[0] as any);

      const { repurposeAnchorContent } = await import("~/server/services/repurposer");
      jest.mocked(repurposeAnchorContent).mockResolvedValue([
        {
          type: "social_post",
          content: "New social post",
          guidance: null,
        },
      ] as any);

      const request = new NextRequest(
        "http://localhost/api/capsules/capsule-1/anchors/anchor-1/repurposed/regenerate-all",
        {
          method: "POST",
        },
      );

      const response = await regenerateAll(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.repurposedContent).toBeDefined();
      expect(Array.isArray(data.repurposedContent)).toBe(true);
      expect(mockDb.repurposedContent.deleteMany).toHaveBeenCalledWith({
        where: { anchorId: "anchor-1" },
      });
      expect(repurposeAnchorContent).toHaveBeenCalled();
    });

    it("should return 404 if anchor not found", async () => {
      jest.mocked(mockDb.anchor.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/capsules/capsule-1/anchors/non-existent/repurposed/regenerate-all",
        {
          method: "POST",
        },
      );

      const response = await regenerateAll(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "non-existent" }),
      });

      expect(response.status).toBe(404);
    });
  });
});
