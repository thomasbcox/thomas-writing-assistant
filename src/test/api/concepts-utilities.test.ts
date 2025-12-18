/**
 * Tests for Concept Utility API routes
 * POST /api/concepts/generate-candidates - Generate concept candidates
 * GET /api/concepts/[id]/propose-links - Propose links for concept
 * POST /api/concepts/[id]/restore - Restore concept from trash
 * POST /api/concepts/purge-trash - Permanently delete old trashed concepts
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { POST as generateCandidates } from "~/app/api/concepts/generate-candidates/route";
import { GET as proposeLinks } from "~/app/api/concepts/[id]/propose-links/route";
import { POST as restoreConcept } from "~/app/api/concepts/[id]/restore/route";
import { POST as purgeTrash } from "~/app/api/concepts/purge-trash/route";
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
        deleteMany: jest.fn(),
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

// Mock services
jest.mock("~/server/services/conceptProposer", () => ({
  generateConceptCandidates: jest.fn(),
}));

jest.mock("~/server/services/linkProposer", () => ({
  proposeLinksForConcept: jest.fn(),
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

describe("Concept Utilities API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(mockDb.concept.findUnique).mockReset();
    jest.mocked(mockDb.concept.update).mockReset();
    jest.mocked(mockDb.concept.deleteMany).mockReset();
  });

  describe("POST /api/concepts/generate-candidates", () => {
    it("should generate concept candidates", async () => {
      const mockCandidates = [
        {
          title: "Candidate 1",
          description: "Description 1",
          content: "Content 1",
          creator: "Author",
          source: "Source",
          year: "2024",
        },
        {
          title: "Candidate 2",
          description: "Description 2",
          content: "Content 2",
          creator: "Author",
          source: "Source",
          year: "2024",
        },
      ];

      const { generateConceptCandidates } = await import("~/server/services/conceptProposer");
      jest.mocked(generateConceptCandidates).mockResolvedValue(mockCandidates as any);

      const request = new NextRequest("http://localhost/api/concepts/generate-candidates", {
        method: "POST",
        body: JSON.stringify({
          text: "Some text to extract concepts from",
          maxCandidates: 5,
        }),
      });

      const response = await generateCandidates(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(generateConceptCandidates).toHaveBeenCalled();
    });

    it("should validate input", async () => {
      const request = new NextRequest("http://localhost/api/concepts/generate-candidates", {
        method: "POST",
        body: JSON.stringify({
          text: "", // Invalid: empty text
        }),
      });

      const response = await generateCandidates(request);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/concepts/[id]/propose-links", () => {
    it("should propose links for a concept", async () => {
      const mockProposals = [
        {
          targetId: "concept-2",
          targetTitle: "Related Concept",
          forwardName: "references",
          reverseName: "referenced by",
          reasoning: "These concepts are related",
        },
      ];

      const { proposeLinksForConcept } = await import("~/server/services/linkProposer");
      jest.mocked(proposeLinksForConcept).mockResolvedValue(mockProposals as any);

      const request = new NextRequest("http://localhost/api/concepts/concept-1/propose-links?maxProposals=5");
      const response = await proposeLinks(request, {
        params: Promise.resolve({ id: "concept-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(proposeLinksForConcept).toHaveBeenCalledWith(
        "concept-1",
        5,
        mockDb,
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("POST /api/concepts/[id]/restore", () => {
    it("should restore a concept from trash", async () => {
      const mockConcept = {
        id: "concept-1",
        title: "Restored Concept",
        status: "active",
        trashedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.mocked(mockDb.concept.update).mockResolvedValue(mockConcept as any);

      const request = new NextRequest("http://localhost/api/concepts/concept-1/restore", {
        method: "POST",
      });

      const response = await restoreConcept(request, {
        params: Promise.resolve({ id: "concept-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("active");
      expect(data.trashedAt).toBeNull();
      expect(mockDb.concept.update).toHaveBeenCalledWith({
        where: { id: "concept-1" },
        data: {
          status: "active",
          trashedAt: null,
        },
      });
    });
  });

  describe("POST /api/concepts/purge-trash", () => {
    it("should permanently delete old trashed concepts", async () => {
      jest.mocked(mockDb.concept.deleteMany).mockResolvedValue({ count: 3 } as any);

      const request = new NextRequest("http://localhost/api/concepts/purge-trash", {
        method: "POST",
        body: JSON.stringify({
          daysOld: 30,
        }),
      });

      const response = await purgeTrash(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deletedCount).toBe(3);
      expect(mockDb.concept.deleteMany).toHaveBeenCalledWith({
        where: {
          status: "trash",
          trashedAt: expect.any(Object),
        },
      });
    });

    it("should use default daysOld if not provided", async () => {
      jest.mocked(mockDb.concept.deleteMany).mockResolvedValue({ count: 0 } as any);

      const request = new NextRequest("http://localhost/api/concepts/purge-trash", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await purgeTrash(request);

      expect(response.status).toBe(200);
      expect(mockDb.concept.deleteMany).toHaveBeenCalled();
    });
  });
});
