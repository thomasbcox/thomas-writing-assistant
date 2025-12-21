/**
 * Tests for Repurposed Content API routes
 * POST /api/capsules/[id]/anchors/[anchorId]/repurposed - Create repurposed content
 */

import { describe, it, expect, jest, beforeEach, beforeAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { setupApiRouteMocks } from "./drizzle-mock-helper";

// Setup mocks (jest.mock is hoisted)
setupApiRouteMocks();

// Import route handler AFTER mocks are set up
import { POST } from "~/app/api/capsules/[id]/anchors/[anchorId]/repurposed/route";

// Get mockDb reference after mocks are set up
let mockDb: ReturnType<typeof import("./drizzle-mock-helper").createDrizzleMockDb>;
beforeAll(async () => {
  const helpers = await import("~/server/api/helpers");
  mockDb = (helpers as any).__mockDb;
});

describe("Repurposed Content API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb._setInsertResult([]);
  });

  describe("POST /api/capsules/[id]/anchors/[anchorId]/repurposed", () => {
    it("should create repurposed content", async () => {
      const mockRepurposed = {
        id: "1",
        anchorId: "anchor-1",
        type: "social_post",
        content: "Content",
        guidance: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.anchor.findFirst.mockResolvedValue({ id: "anchor-1" });
      mockDb._setInsertResult([mockRepurposed]);

      const request = new NextRequest(
        "http://localhost/api/capsules/capsule-1/anchors/anchor-1/repurposed",
        {
          method: "POST",
          body: JSON.stringify({
            type: "social_post",
            content: "Content",
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe("social_post");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return 404 for non-existent anchor", async () => {
      mockDb.query.anchor.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/capsules/capsule-1/anchors/999/repurposed",
        {
          method: "POST",
          body: JSON.stringify({
            type: "social_post",
            content: "Content",
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "999" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Anchor not found");
    });

    it("should validate required fields", async () => {
      mockDb.query.anchor.findFirst.mockResolvedValue({ id: "anchor-1" });

      const request = new NextRequest(
        "http://localhost/api/capsules/capsule-1/anchors/anchor-1/repurposed",
        {
          method: "POST",
          body: JSON.stringify({
            // Missing required fields
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "capsule-1", anchorId: "anchor-1" }),
      });
      expect(response.status).toBe(400);
    });
  });
});
