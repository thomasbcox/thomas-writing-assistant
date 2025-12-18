/**
 * Tests for Link Names API routes
 * GET /api/link-names - List all link names
 * POST /api/link-names - Create link name
 * GET /api/link-names/[name] - Get link name usage
 * PUT /api/link-names/[name] - Update/rename link name
 * DELETE /api/link-names/[name] - Delete link name
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { GET as getLinkNames, POST as createLinkName } from "~/app/api/link-names/route";
import { PUT as updateLinkName, DELETE as deleteLinkName } from "~/app/api/link-names/[name]/route";
import { GET as getLinkNameUsage } from "~/app/api/link-names/[name]/usage/route";
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
        update: jest.fn(),
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

describe("Link Names API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(mockDb.linkName.findMany).mockReset();
    jest.mocked(mockDb.linkName.findUnique).mockReset();
    jest.mocked(mockDb.linkName.create).mockReset();
    jest.mocked(mockDb.linkName.update).mockReset();
    jest.mocked(mockDb.linkName.delete).mockReset();
    jest.mocked(mockDb.link.findMany).mockReset();
    jest.mocked(mockDb.link.update).mockReset();
    jest.mocked(mockDb.link.count).mockReset();
  });

  describe("GET /api/link-names", () => {
    it("should return list of link names", async () => {
      const mockCustomNames = [
        {
          id: "1",
          name: "custom-relation",
          isDefault: false,
          isDeleted: false,
        },
      ];

      jest.mocked(mockDb.linkName.findMany).mockResolvedValueOnce([]); // No deleted defaults
      jest.mocked(mockDb.linkName.findMany).mockResolvedValueOnce(mockCustomNames as any); // Custom names

      const response = await getLinkNames();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/link-names", () => {
    it("should create a new link name", async () => {
      const mockLinkName = {
        id: "1",
        name: "new-relation",
        isDefault: false,
        isDeleted: false,
        createdAt: new Date(),
      };

      jest.mocked(mockDb.linkName.findUnique).mockResolvedValue(null); // Doesn't exist
      jest.mocked(mockDb.linkName.create).mockResolvedValue(mockLinkName as any);

      const request = new NextRequest("http://localhost/api/link-names", {
        method: "POST",
        body: JSON.stringify({
          name: "new-relation",
        }),
      });

      const response = await createLinkName(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("new-relation");
      expect(mockDb.linkName.create).toHaveBeenCalledWith({
        data: {
          name: "new-relation",
          isDefault: false,
        },
      });
    });

    it("should return existing link name if it already exists", async () => {
      const mockLinkName = {
        id: "1",
        name: "existing-relation",
        isDefault: false,
        isDeleted: false,
      };

      jest.mocked(mockDb.linkName.findUnique).mockResolvedValue(mockLinkName as any);

      const request = new NextRequest("http://localhost/api/link-names", {
        method: "POST",
        body: JSON.stringify({
          name: "existing-relation",
        }),
      });

      const response = await createLinkName(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("existing-relation");
      expect(mockDb.linkName.create).not.toHaveBeenCalled();
    });

    it("should validate input", async () => {
      const request = new NextRequest("http://localhost/api/link-names", {
        method: "POST",
        body: JSON.stringify({
          name: "", // Invalid: empty name
        }),
      });

      const response = await createLinkName(request);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/link-names/[name]", () => {
    it("should return link name usage", async () => {
      const mockLinks = [
        {
          id: "link-1",
          sourceId: "concept-1",
          targetId: "concept-2",
          forwardName: "references",
          reverseName: "referenced by",
          source: { id: "concept-1", title: "Source Concept" },
          target: { id: "concept-2", title: "Target Concept" },
        },
      ];

      jest.mocked(mockDb.link.findMany).mockResolvedValue(mockLinks as any);

      const request = new NextRequest("http://localhost/api/link-names/references");
      const response = await getLinkNameUsage(request, {
        params: Promise.resolve({ name: "references" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("references");
      expect(data.count).toBe(1);
      expect(Array.isArray(data.links)).toBe(true);
      expect(data.isDefault).toBe(true);
    });
  });

  describe("PUT /api/link-names/[name]", () => {
    it("should update/rename a link name", async () => {
      const mockLinks = [
        {
          id: "link-1",
          sourceId: "concept-1",
          targetId: "concept-2",
          forwardName: "old-name",
          reverseName: "old-reverse",
        },
      ];

      jest.mocked(mockDb.link.findMany).mockResolvedValue(mockLinks as any);
      jest.mocked(mockDb.link.update).mockResolvedValue({} as any);
      jest.mocked(mockDb.linkName.findUnique).mockResolvedValue({
        id: "1",
        name: "old-name",
        isDefault: false,
      } as any);
      jest.mocked(mockDb.linkName.delete).mockResolvedValue({} as any);
      jest.mocked(mockDb.linkName.findUnique).mockResolvedValueOnce(null); // New name doesn't exist
      jest.mocked(mockDb.linkName.create).mockResolvedValue({
        id: "2",
        name: "new-name",
        isDefault: false,
      } as any);

      const request = new NextRequest("http://localhost/api/link-names/old-name", {
        method: "PUT",
        body: JSON.stringify({
          newName: "new-name",
        }),
      });

      const response = await updateLinkName(request, {
        params: Promise.resolve({ name: "old-name" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.link.update).toHaveBeenCalled();
    });

    it("should validate input", async () => {
      const request = new NextRequest("http://localhost/api/link-names/old-name", {
        method: "PUT",
        body: JSON.stringify({
          newName: "", // Invalid: empty name
        }),
      });

      const response = await updateLinkName(request, {
        params: Promise.resolve({ name: "old-name" }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/link-names/[name]", () => {
    it("should delete a custom link name", async () => {
      jest.mocked(mockDb.link.count).mockResolvedValue(0); // No usage
      jest.mocked(mockDb.linkName.delete).mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost/api/link-names/custom-name");
      const response = await deleteLinkName(request, {
        params: Promise.resolve({ name: "custom-name" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.linkName.delete).toHaveBeenCalled();
    });

    it("should mark default link name as deleted if in use with replacement", async () => {
      const mockLinks = [
        {
          id: "link-1",
          sourceId: "concept-1",
          targetId: "concept-2",
          forwardName: "references",
          reverseName: "referenced by",
        },
      ];

      jest.mocked(mockDb.link.count).mockResolvedValue(5); // Has usage
      jest.mocked(mockDb.link.findMany).mockResolvedValue(mockLinks as any);
      jest.mocked(mockDb.link.update).mockResolvedValue({} as any);
      jest.mocked(mockDb.linkName.findUnique).mockResolvedValue(null); // Doesn't exist yet
      jest.mocked(mockDb.linkName.create).mockResolvedValue({
        id: "1",
        name: "references",
        isDefault: true,
        isDeleted: true,
      } as any);

      const request = new NextRequest("http://localhost/api/link-names/references?replaceWith=related%20to");
      const response = await deleteLinkName(request, {
        params: Promise.resolve({ name: "references" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.link.update).toHaveBeenCalled(); // Should update links
    });

    it("should return error if default link name is in use without replacement", async () => {
      jest.mocked(mockDb.link.count).mockResolvedValue(5); // Has usage

      const request = new NextRequest("http://localhost/api/link-names/references");
      const response = await deleteLinkName(request, {
        params: Promise.resolve({ name: "references" }),
      });

      expect(response.status).toBe(400);
    });
  });
});
