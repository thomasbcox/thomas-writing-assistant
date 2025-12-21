/**
 * Tests for Capsules API routes
 * GET /api/capsules - List all capsules
 * POST /api/capsules - Create capsule
 */

import { describe, it, expect, jest, beforeEach, beforeAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { setupApiRouteMocks } from "./drizzle-mock-helper";

// Setup mocks (jest.mock is hoisted)
setupApiRouteMocks();

// Import route handler AFTER mocks are set up
import { GET, POST } from "~/app/api/capsules/route";

// Get mockDb reference after mocks are set up
let mockDb: ReturnType<typeof import("./drizzle-mock-helper").createDrizzleMockDb>;
beforeAll(async () => {
  const helpers = await import("~/server/api/helpers");
  mockDb = (helpers as any).__mockDb;
});

describe("Capsules API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb._setSelectResult([]);
    mockDb._setInsertResult([]);
  });

  describe("GET /api/capsules", () => {
    it("should return list of capsules", async () => {
      const mockCapsules = [
        {
          id: "1",
          title: "Test Capsule",
          promise: "Promise",
          cta: "CTA",
          offerMapping: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb._setSelectResult(mockCapsules);
      // Mock anchors query (empty)
      mockDb._selectBuilder.from.mockReturnValueOnce({
        where: jest.fn().mockReturnValueOnce({
          orderBy: jest.fn(() => Promise.resolve([])),
        }),
      });
      // Mock repurposed content query (empty)
      mockDb._selectBuilder.from.mockReturnValueOnce({
        where: jest.fn().mockReturnValueOnce({
          orderBy: jest.fn(() => Promise.resolve([])),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Test Capsule");
      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should return empty array when no capsules", async () => {
      mockDb._setSelectResult([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("POST /api/capsules", () => {
    it("should create a new capsule", async () => {
      const mockCapsule = {
        id: "1",
        title: "New Capsule",
        promise: "Promise",
        cta: "CTA",
        offerMapping: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb._setInsertResult([mockCapsule]);

      const request = new NextRequest("http://localhost/api/capsules", {
        method: "POST",
        body: JSON.stringify({
          title: "New Capsule",
          promise: "Promise",
          cta: "CTA",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("New Capsule");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost/api/capsules", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
