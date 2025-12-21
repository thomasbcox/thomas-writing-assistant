/**
 * Tests for Health API route
 * GET /api/health - Health check endpoint
 * Uses Drizzle ORM mocks
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { NextRequest } from "next/server";

// Create mock for Drizzle database
const mockSelect = jest.fn().mockReturnValue({
  from: jest.fn().mockReturnValue({
    limit: jest.fn().mockResolvedValue([]),
  }),
});

const mockDb = {
  select: mockSelect,
};

jest.mock("~/server/api/helpers", () => {
  const mockSelect = jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue([]),
    }),
  });
  const mockDb = {
    select: mockSelect,
  };
  return {
    getDb: jest.fn(() => mockDb),
    handleApiError: jest.fn((error) => {
      if (error instanceof Error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ error: "Unknown error" }), { status: 500 });
    }),
    __mockDb: mockDb,
    __mockSelect: mockSelect,
  };
});

// Mock config loader
const mockConfigLoader = {
  getConfigStatus: jest.fn(() => ({
    styleGuide: { loaded: true, isEmpty: false },
    credo: { loaded: true, isEmpty: false },
    constraints: { loaded: true, isEmpty: false },
  })),
};

jest.mock("~/server/services/config", () => ({
  getConfigLoader: jest.fn(() => mockConfigLoader),
}));

// Import route handler AFTER mocks are set up
import { GET } from "~/app/api/health/route";

describe("Health API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return healthy status when all checks pass", async () => {
      const helpers = await import("~/server/api/helpers");
      const mockSelect = (helpers as any).__mockSelect;
      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
      expect(data.checks.server.status).toBe("healthy");
      expect(data.checks.database.status).toBe("healthy");
      expect(data.checks.config.status).toBe("healthy");
      expect(data.checks.api.status).toBe("healthy");
    });

    it("should return degraded status when config files are missing", async () => {
      const helpers = await import("~/server/api/helpers");
      const mockSelect = (helpers as any).__mockSelect;
      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });
      jest.mocked(mockConfigLoader.getConfigStatus).mockReturnValue({
        styleGuide: { loaded: true, isEmpty: true },
        credo: { loaded: true, isEmpty: true },
        constraints: { loaded: true, isEmpty: true },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("degraded");
      expect(data.checks.config.status).toBe("degraded");
      expect(data.checks.config.issues.length).toBeGreaterThan(0);
    });

    it("should return unhealthy status when database fails", async () => {
      const helpers = await import("~/server/api/helpers");
      const mockSelect = (helpers as any).__mockSelect;
      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error("Database connection failed")),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("unhealthy");
      expect(data.checks.database.status).toBe("unhealthy");
      expect(data.issues.length).toBeGreaterThan(0);
    });

    it("should include response times in checks", async () => {
      const helpers = await import("~/server/api/helpers");
      const mockSelect = (helpers as any).__mockSelect;
      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.checks.server.responseTime).toBeDefined();
      expect(typeof data.checks.server.responseTime).toBe("number");
      expect(data.checks.database.responseTime).toBeDefined();
      expect(typeof data.checks.database.responseTime).toBe("number");
    });

    it("should handle config loader errors gracefully", async () => {
      const helpers = await import("~/server/api/helpers");
      const mockSelect = (helpers as any).__mockSelect;
      mockSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });
      jest.mocked(mockConfigLoader.getConfigStatus).mockImplementation(() => {
        throw new Error("Config load failed");
      });

      const response = await GET();
      const data = await response.json();

      expect(data.checks.config.status).toBe("unhealthy");
      expect(data.issues.length).toBeGreaterThan(0);
    });
  });
});
