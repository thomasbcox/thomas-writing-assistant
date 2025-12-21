/**
 * Tests for Admin DB Stats API route
 * GET /api/admin/db-stats - Get database statistics
 */

import { describe, it, expect, jest, beforeEach, beforeAll } from "@jest/globals";
import { setupApiRouteMocks } from "./drizzle-mock-helper";

// Setup mocks (jest.mock is hoisted)
setupApiRouteMocks();

// Import route handler AFTER mocks are set up
import { GET } from "~/app/api/admin/db-stats/route";

// Get mockDb reference after mocks are set up
let mockDb: ReturnType<typeof import("./drizzle-mock-helper").createDrizzleMockDb>;
beforeAll(async () => {
  const helpers = await import("~/server/api/helpers");
  mockDb = (helpers as any).__mockDb;
});

describe("Admin DB Stats API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb._setSelectResult([]);
  });

  describe("GET /api/admin/db-stats", () => {
    it("should return database statistics", async () => {
      // Mock all the select queries
      mockDb._setSelectResult([]); // All queries return empty arrays
      // Mock the sample queries
      mockDb._selectBuilder.limit = jest.fn(() => Promise.resolve([]));
      mockDb.query.link.findMany.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("counts");
      expect(data).toHaveProperty("breakdowns");
      expect(data).toHaveProperty("samples");
      expect(data.counts).toHaveProperty("Concept");
      expect(data.counts).toHaveProperty("Link");
      expect(data.counts).toHaveProperty("Capsule");
    });

    it("should return correct counts", async () => {
      const mockConcepts = [
        { id: "1", status: "active" },
        { id: "2", status: "active" },
        { id: "3", status: "trash" },
      ];
      const mockLinks = [{ id: "1" }];
      const mockCapsules = [{ id: "1" }];

      // Mock different results for different queries
      let callCount = 0;
      mockDb._selectBuilder.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          // First 3 calls are for concepts (all, active, trash)
          return {
            where: jest.fn(() => ({
              then: jest.fn((resolve) => {
                if (callCount === 1) {
                  return Promise.resolve(mockConcepts).then(resolve);
                } else if (callCount === 2) {
                  return Promise.resolve(mockConcepts.filter((c) => c.status === "active")).then(resolve);
                } else {
                  return Promise.resolve(mockConcepts.filter((c) => c.status === "trash")).then(resolve);
                }
              }),
            })),
          };
        } else if (callCount === 4) {
          return {
            then: jest.fn((resolve) => Promise.resolve(mockLinks).then(resolve)),
          };
        } else if (callCount === 5) {
          return {
            then: jest.fn((resolve) => Promise.resolve(mockCapsules).then(resolve)),
          };
        }
        return {
          then: jest.fn((resolve) => Promise.resolve([]).then(resolve)),
        };
      });

      mockDb._selectBuilder.limit = jest.fn(() => Promise.resolve([]));
      mockDb.query.link.findMany.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.counts.Concept).toBe(3);
      expect(data.breakdowns.concepts.total).toBe(3);
      expect(data.breakdowns.concepts.active).toBe(2);
      expect(data.breakdowns.concepts.trashed).toBe(1);
    });
  });
});
