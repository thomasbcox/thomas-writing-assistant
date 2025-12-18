/**
 * Tests for Config API routes
 * GET /api/config/status - Get config status
 * GET/PUT /api/config/style-guide - Style guide management
 * GET/PUT /api/config/credo - Credo management
 * GET/PUT /api/config/constraints - Constraints management
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { GET as getStatus } from "~/app/api/config/status/route";
import { GET as getStyleGuide, PUT as putStyleGuide } from "~/app/api/config/style-guide/route";
import { GET as getCredo, PUT as putCredo } from "~/app/api/config/credo/route";
import { GET as getConstraints, PUT as putConstraints } from "~/app/api/config/constraints/route";
import { NextRequest } from "next/server";

// Mock the config service - create a single mock instance
const mockConfigLoader = {
  getConfigStatus: jest.fn(() => ({
    styleGuide: { loaded: true, isEmpty: false },
    credo: { loaded: true, isEmpty: false },
    constraints: { loaded: true, isEmpty: false },
  })),
  getStyleGuide: jest.fn(() => ({ voice: { tone: "professional" } })),
  getCredo: jest.fn(() => ({ core_beliefs: ["Value 1"] })),
  getConstraints: jest.fn(() => ({ never_do: ["Never this"] })),
  getStyleGuideRaw: jest.fn(() => "voice:\n  tone: professional"),
  getCredoRaw: jest.fn(() => "core_beliefs:\n  - Value 1"),
  getConstraintsRaw: jest.fn(() => "never_do:\n  - Never this"),
  updateStyleGuide: jest.fn(),
  updateCredo: jest.fn(),
  updateConstraints: jest.fn(),
  reloadConfigs: jest.fn(),
};

jest.mock("~/server/services/config", () => ({
  getConfigLoader: jest.fn(() => mockConfigLoader),
}));

// Mock fs module - need to mock both default and named exports
jest.mock("fs", () => {
  const mockWriteFileSync = jest.fn();
  const mockReadFileSync = jest.fn(() => "mock content");
  const mockExistsSync = jest.fn(() => true);
  
  return {
    default: {
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync,
      writeFileSync: mockWriteFileSync,
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    __mockWriteFileSync: mockWriteFileSync, // Export for test access
  };
});

// Database and helpers are mocked globally in setup.ts
// Individual mocks can override if needed

describe("Config API", () => {
  let mockWriteFileSync: ReturnType<typeof jest.fn>;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    const fs = await import("fs");
    mockWriteFileSync = (fs as any).__mockWriteFileSync || jest.fn();
    mockWriteFileSync.mockClear();
  });

  describe("GET /api/config/status", () => {
    it("should return config status", async () => {
      const response = await getStatus();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("styleGuide");
      expect(data).toHaveProperty("credo");
      expect(data).toHaveProperty("constraints");
      expect(data.styleGuide).toHaveProperty("loaded");
      expect(data.styleGuide).toHaveProperty("isEmpty");
    });
  });

  describe("GET /api/config/style-guide", () => {
    it("should return parsed style guide", async () => {
      const request = new NextRequest("http://localhost/api/config/style-guide");
      const response = await getStyleGuide(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("voice");
    });

    it("should return raw YAML when raw=true", async () => {
      const request = new NextRequest("http://localhost/api/config/style-guide?raw=true");
      const response = await getStyleGuide(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("content");
      expect(typeof data.content).toBe("string");
    });
  });

  describe("PUT /api/config/style-guide", () => {
    it("should update style guide", async () => {
      const request = new NextRequest("http://localhost/api/config/style-guide", {
        method: "PUT",
        body: JSON.stringify({
          content: "voice:\n  tone: updated",
        }),
      });

      const response = await putStyleGuide(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(mockConfigLoader.reloadConfigs).toHaveBeenCalled();
    });
  });

  describe("GET /api/config/credo", () => {
    it("should return parsed credo", async () => {
      const request = new NextRequest("http://localhost/api/config/credo");
      const response = await getCredo(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("core_beliefs");
    });

    it("should return raw YAML when raw=true", async () => {
      const request = new NextRequest("http://localhost/api/config/credo?raw=true");
      const response = await getCredo(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("content");
      expect(typeof data.content).toBe("string");
    });
  });

  describe("PUT /api/config/credo", () => {
    it("should update credo", async () => {
      const request = new NextRequest("http://localhost/api/config/credo", {
        method: "PUT",
        body: JSON.stringify({
          content: "core_beliefs:\n  - Updated value",
        }),
      });

      const response = await putCredo(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(mockConfigLoader.reloadConfigs).toHaveBeenCalled();
    });
  });

  describe("GET /api/config/constraints", () => {
    it("should return parsed constraints", async () => {
      const request = new NextRequest("http://localhost/api/config/constraints");
      const response = await getConstraints(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("never_do");
    });

    it("should return raw YAML when raw=true", async () => {
      const request = new NextRequest("http://localhost/api/config/constraints?raw=true");
      const response = await getConstraints(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("content");
      expect(typeof data.content).toBe("string");
    });
  });

  describe("PUT /api/config/constraints", () => {
    it("should update constraints", async () => {
      const request = new NextRequest("http://localhost/api/config/constraints", {
        method: "PUT",
        body: JSON.stringify({
          content: "never_do:\n  - Updated constraint",
        }),
      });

      const response = await putConstraints(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // The route writes to file and reloads config
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(mockConfigLoader.reloadConfigs).toHaveBeenCalled();
    });
  });
});

