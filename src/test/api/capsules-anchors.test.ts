/**
 * Tests for Capsule Anchors API routes
 * POST /api/capsules/[id]/anchors - Create anchor
 */

import { describe, it, expect, jest, beforeEach, beforeAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { setupApiRouteMocks } from "./drizzle-mock-helper";

// Setup mocks (jest.mock is hoisted)
setupApiRouteMocks();

// Import route handler AFTER mocks are set up
import { POST } from "~/app/api/capsules/[id]/anchors/route";

// Get mockDb reference after mocks are set up
let mockDb: ReturnType<typeof import("./drizzle-mock-helper").createDrizzleMockDb>;
beforeAll(async () => {
  const helpers = await import("~/server/api/helpers");
  mockDb = (helpers as any).__mockDb;
});

describe("Capsule Anchors API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb._setInsertResult([]);
  });

  describe("POST /api/capsules/[id]/anchors", () => {
    it("should create a new anchor", async () => {
      const mockAnchor = {
        id: "1",
        capsuleId: "capsule-1",
        title: "Test Anchor",
        content: "Content",
        painPoints: null,
        solutionSteps: null,
        proof: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.capsule.findFirst.mockResolvedValue({ id: "capsule-1" });
      mockDb._setInsertResult([mockAnchor]);

      const request = new NextRequest("http://localhost/api/capsules/capsule-1/anchors", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Anchor",
          content: "Content",
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "capsule-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("Test Anchor");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return 404 for non-existent capsule", async () => {
      mockDb.query.capsule.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/capsules/999/anchors", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Anchor",
          content: "Content",
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "999" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Capsule not found");
    });

    it("should validate required fields", async () => {
      mockDb.query.capsule.findFirst.mockResolvedValue({ id: "capsule-1" });

      const request = new NextRequest("http://localhost/api/capsules/capsule-1/anchors", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "capsule-1" }),
      });
      expect(response.status).toBe(400);
    });
  });
});
