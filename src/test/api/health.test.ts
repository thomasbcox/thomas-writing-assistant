/**
 * Tests for Health API route
 * GET /api/health - Health check endpoint
 * Uses in-memory database
 */

import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from "@jest/globals";
import { cleanupTestData } from "../test-utils";
import type { ReturnType } from "~/server/db";
import { setupInMemoryDbMocks, initInMemoryDb, cleanupInMemoryDb } from "../utils/in-memory-db-setup";
import { setDependencies, resetDependencies } from "~/server/dependencies";
import { createTestDependencies, createMockConfigLoader } from "../utils/dependencies";

// Setup mocks (must be before route imports)
setupInMemoryDbMocks();

type Database = ReturnType<typeof import("~/server/db").db>;

// Create test database - will be initialized in beforeAll
let testDb: Database;

let testDependencies: Awaited<ReturnType<typeof createTestDependencies>>;
let mockConfigLoader: ReturnType<typeof createMockConfigLoader>;

beforeAll(async () => {
  testDb = await initInMemoryDb();
  
  // Create test dependencies with mocks
  mockConfigLoader = createMockConfigLoader({
    getConfigStatus: jest.fn(() => ({
      styleGuide: { loaded: true, isEmpty: false },
      credo: { loaded: true, isEmpty: false },
      constraints: { loaded: true, isEmpty: false },
    })),
    reloadConfigs: jest.fn(),
    getStyleGuide: jest.fn(() => ({})),
    getCredo: jest.fn(() => ({})),
    getConstraints: jest.fn(() => ({})),
    getSystemPrompt: jest.fn(() => "mock prompt"),
  });
  
  testDependencies = await createTestDependencies({
    configLoader: mockConfigLoader,
    db: testDb,
  });
  
  // Set dependencies for the application
  setDependencies(testDependencies);
});

afterAll(() => {
  cleanupInMemoryDb();
  resetDependencies();
});

describe("Health API", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset config loader mock
    jest.mocked(mockConfigLoader.getConfigStatus).mockReturnValue({
      styleGuide: { loaded: true, isEmpty: false },
      credo: { loaded: true, isEmpty: false },
      constraints: { loaded: true, isEmpty: false },
    });
  });

  describe("GET /api/health", () => {
    it("should return healthy status when all checks pass", async () => {
      const { GET } = await import("~/app/api/health/route");

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
      const { GET } = await import("~/app/api/health/route");
      
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

    it("should include response times in checks", async () => {
      const { GET } = await import("~/app/api/health/route");

      const response = await GET();
      const data = await response.json();

      expect(data.checks.server.responseTime).toBeDefined();
      expect(typeof data.checks.server.responseTime).toBe("number");
      expect(data.checks.database.responseTime).toBeDefined();
      expect(typeof data.checks.database.responseTime).toBe("number");
    });

    it("should handle config loader errors gracefully", async () => {
      // Make the mock throw an error
      jest.mocked(mockConfigLoader.getConfigStatus).mockImplementationOnce(() => {
        throw new Error("Config load failed");
      });

      const { GET } = await import("~/app/api/health/route");
      const response = await GET();
      const data = await response.json();

      expect(data.checks.config.status).toBe("unhealthy");
      expect(data.issues.length).toBeGreaterThan(0);
      expect(data.issues.some((issue: string) => issue.includes("Configuration"))).toBe(true);
    });
  });
});
