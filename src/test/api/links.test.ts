/**
 * Tests for Links API routes
 * GET /api/links - List links
 * POST /api/links - Create link
 * DELETE /api/links/[sourceId]/[targetId] - Delete link
 */

import { describe, it, expect, jest, beforeEach, beforeAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { setupApiRouteMocks } from "./drizzle-mock-helper";

// Setup mocks (jest.mock is hoisted)
setupApiRouteMocks();

// Import route handlers AFTER mocks are set up
import { GET, POST } from "~/app/api/links/route";
import { DELETE } from "~/app/api/links/[sourceId]/[targetId]/route";

// Get mockDb reference after mocks are set up
let mockDb: ReturnType<typeof import("./drizzle-mock-helper").createDrizzleMockDb>;
beforeAll(async () => {
  const helpers = await import("~/server/api/helpers");
  mockDb = (helpers as any).__mockDb;
});

describe("Links API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb._setSelectResult([]);
    mockDb._setInsertResult([]);
  });

  describe("GET /api/links", () => {
    it("should return all links", async () => {
      const mockLinks = [
        {
          id: "1",
          sourceId: "source-1",
          targetId: "target-1",
          linkNameId: "linkname-1",
          notes: "Notes",
          createdAt: new Date(),
          source: { id: "source-1", title: "Source" },
          target: { id: "target-1", title: "Target" },
          linkName: { id: "linkname-1", forwardName: "relates to", reverseName: "related from" },
        },
      ];

      mockDb.query.link.findMany.mockResolvedValue(mockLinks);

      const request = new NextRequest("http://localhost/api/links");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(mockDb.query.link.findMany).toHaveBeenCalled();
    });

    it("should filter by conceptId", async () => {
      const mockOutgoing = [
        {
          id: "1",
          sourceId: "concept-1",
          targetId: "target-1",
          linkNameId: "linkname-1",
          source: { id: "concept-1", title: "Source" },
          target: { id: "target-1", title: "Target" },
          linkName: { id: "linkname-1", forwardName: "relates to", reverseName: "related from" },
        },
      ];

      const mockIncoming = [
        {
          id: "2",
          sourceId: "source-1",
          targetId: "concept-1",
          linkNameId: "linkname-1",
          source: { id: "source-1", title: "Source" },
          target: { id: "concept-1", title: "Target" },
          linkName: { id: "linkname-1", forwardName: "relates to", reverseName: "related from" },
        },
      ];

      mockDb.query.link.findMany
        .mockResolvedValueOnce(mockOutgoing)
        .mockResolvedValueOnce(mockIncoming);

      const request = new NextRequest("http://localhost/api/links?conceptId=concept-1");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("outgoing");
      expect(data).toHaveProperty("incoming");
      expect(data.outgoing).toHaveLength(1);
      expect(data.incoming).toHaveLength(1);
    });
  });

  describe("POST /api/links", () => {
    it("should create a new link", async () => {
      const mockLink = {
        id: "1",
        sourceId: "source-1",
        targetId: "target-1",
        linkNameId: "linkname-1",
        notes: "Notes",
        createdAt: new Date(),
        source: { id: "source-1", title: "Source" },
        target: { id: "target-1", title: "Target" },
        linkName: { id: "linkname-1", forwardName: "relates to", reverseName: "related from" },
      };

      // First check if link exists (should return null)
      mockDb.query.link.findFirst.mockResolvedValue(null);
      // Then return created link
      mockDb._setInsertResult([{ id: "1", sourceId: "source-1", targetId: "target-1" }]);
      mockDb.query.link.findFirst.mockResolvedValueOnce(mockLink);

      const request = new NextRequest("http://localhost/api/links", {
        method: "POST",
        body: JSON.stringify({
          sourceId: "source-1",
          targetId: "target-1",
          linkNameId: "linkname-1",
          notes: "Notes",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.sourceId).toBe("source-1");
      expect(data.targetId).toBe("target-1");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return existing link if already exists", async () => {
      const existingLink = {
        id: "1",
        sourceId: "source-1",
        targetId: "target-1",
        linkNameId: "linkname-1",
        source: { id: "source-1", title: "Source" },
        target: { id: "target-1", title: "Target" },
        linkName: { id: "linkname-1", forwardName: "relates to", reverseName: "related from" },
      };

      mockDb.query.link.findFirst.mockResolvedValue(existingLink);
      mockDb._setUpdateResult([existingLink]);
      mockDb.query.link.findFirst.mockResolvedValueOnce(existingLink);

      const request = new NextRequest("http://localhost/api/links", {
        method: "POST",
        body: JSON.stringify({
          sourceId: "source-1",
          targetId: "target-1",
          linkNameId: "linkname-1",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("1");
    });
  });

  describe("DELETE /api/links/[sourceId]/[targetId]", () => {
    it("should delete a link", async () => {
      mockDb._setDeleteResult([{ id: "1" }]);

      const request = new NextRequest("http://localhost/api/links/source-1/target-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ sourceId: "source-1", targetId: "target-1" }),
      });

      expect(response.status).toBe(200);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
