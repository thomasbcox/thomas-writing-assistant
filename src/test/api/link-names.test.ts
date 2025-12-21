/**
 * Tests for Link Names API routes
 * GET /api/link-names - List all link names
 * POST /api/link-names - Create link name
 */

import { describe, it, expect, jest, beforeEach, beforeAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { setupApiRouteMocks } from "./drizzle-mock-helper";

// Setup mocks (jest.mock is hoisted)
setupApiRouteMocks();

// Import route handler AFTER mocks are set up
import { GET, POST } from "~/app/api/link-names/route";

// Get mockDb reference after mocks are set up
let mockDb: ReturnType<typeof import("./drizzle-mock-helper").createDrizzleMockDb>;
beforeAll(async () => {
  const helpers = await import("~/server/api/helpers");
  mockDb = (helpers as any).__mockDb;
});

describe("Link Names API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb._setSelectResult([]);
    mockDb._setInsertResult([]);
  });

  describe("GET /api/link-names", () => {
    it("should return list of link names", async () => {
      const mockCustomNames = [
        { id: "1", name: "custom-name", isDefault: false, isDeleted: false },
      ];
      const mockDeletedDefaults = [];

      mockDb._setSelectResult(mockCustomNames);
      // Second call for deleted defaults
      mockDb._selectBuilder.from.mockReturnValueOnce({
        where: jest.fn().mockReturnValueOnce({
          then: jest.fn((resolve) => Promise.resolve(mockDeletedDefaults).then(resolve)),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("POST /api/link-names", () => {
    it("should create a new link name", async () => {
      const mockLinkName = {
        id: "1",
        name: "new-relationship",
        isDefault: false,
        isDeleted: false,
      };

      mockDb.query.linkName.findFirst.mockResolvedValue(null);
      mockDb._setInsertResult([mockLinkName]);

      const request = new NextRequest("http://localhost/api/link-names", {
        method: "POST",
        body: JSON.stringify({
          name: "new-relationship",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("new-relationship");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return existing link name if already exists", async () => {
      const existingLinkName = {
        id: "1",
        name: "existing-name",
        isDefault: false,
        isDeleted: false,
      };

      mockDb.query.linkName.findFirst.mockResolvedValue(existingLinkName);

      const request = new NextRequest("http://localhost/api/link-names", {
        method: "POST",
        body: JSON.stringify({
          name: "existing-name",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("1");
    });

    it("should reject empty link name", async () => {
      const request = new NextRequest("http://localhost/api/link-names", {
        method: "POST",
        body: JSON.stringify({
          name: "   ",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
