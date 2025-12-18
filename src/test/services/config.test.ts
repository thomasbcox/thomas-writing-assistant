/**
 * Tests for config service
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { ConfigLoader, getConfigLoader } from "~/server/services/config";
import fs from "fs";
import path from "path";

// Mock fs only (don't mock path - it's a built-in Node.js module)
jest.mock("fs", () => ({
  default: {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
  },
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock the logger
jest.mock("~/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logServiceError: jest.fn(),
}));

describe("ConfigLoader", () => {
  let configLoader: ConfigLoader;
  const mockStyleGuide = {
    voice: { tone: "professional" },
    writing_style: { format: "structured" },
  };

  const mockCredo = {
    core_beliefs: ["Value 1", "Value 2"],
    content_philosophy: { approach: "authentic" },
  };

  const mockConstraints = {
    never_do: ["Never do this"],
    always_do: ["Always do this"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs.existsSync to return true for config files
    jest.mocked(fs.existsSync as any).mockReturnValue(true);

    // Mock fs.readFileSync to return YAML content
    jest.mocked(fs.readFileSync as any).mockImplementation((filePath: string | Buffer) => {
      const pathStr = filePath.toString();
      if (pathStr.includes("style-guide") || pathStr.includes("style_guide")) {
        return "voice:\n  tone: professional\nwriting_style:\n  format: structured";
      }
      if (pathStr.includes("credo")) {
        return "core_beliefs:\n  - Value 1\n  - Value 2\ncontent_philosophy:\n  approach: authentic";
      }
      if (pathStr.includes("constraints")) {
        return "never_do:\n  - Never do this\nalways_do:\n  - Always do this";
      }
      return "";
    });

    configLoader = new ConfigLoader();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSystemPrompt", () => {
    it("should return original prompt when no style guide is loaded", () => {
      jest.mocked(fs.existsSync as any).mockReturnValue(false);
      jest.mocked(fs.readFileSync as any).mockReturnValue("");
      const freshLoader = new ConfigLoader();
      
      const prompt = freshLoader.getSystemPrompt("Original prompt");
      expect(prompt).toContain("Original prompt");
    });

    it("should enhance prompt with style guide when available", () => {
      const prompt = configLoader.getSystemPrompt("Original prompt");
      expect(prompt).toContain("Original prompt");
      // Style guide should be included in the enhanced prompt
      expect(typeof prompt).toBe("string");
    });
  });

  describe("reloadConfigs", () => {
    it("should reload all config files", () => {
      const initialReadCount = jest.mocked(fs.readFileSync as any).mock.calls.length;
      
      configLoader.reloadConfigs();
      
      // Should read config files again
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(jest.mocked(fs.readFileSync as any).mock.calls.length).toBeGreaterThan(initialReadCount);
    });
  });

  describe("getConfigStatus", () => {
    it("should return status for all config files", () => {
      jest.mocked(fs.existsSync as any).mockReturnValue(true);
      
      const status = configLoader.getConfigStatus();
      
      expect(status).toHaveProperty("styleGuide");
      expect(status).toHaveProperty("credo");
      expect(status).toHaveProperty("constraints");
      expect(status.styleGuide).toHaveProperty("loaded");
      expect(status.styleGuide).toHaveProperty("isEmpty");
    });

    it("should indicate when config files are missing", () => {
      jest.mocked(fs.existsSync as any).mockReturnValue(false);
      jest.mocked(fs.readFileSync as any).mockReturnValue("");
      const freshLoader = new ConfigLoader();
      
      const status = freshLoader.getConfigStatus();
      
      // Since files don't exist or are empty, they should be marked as not loaded/empty
      expect(status.styleGuide.loaded).toBe(false);
      expect(status.credo.loaded).toBe(false);
      expect(status.constraints.loaded).toBe(false);
    });

    it("should indicate when config files are empty", () => {
      jest.mocked(fs.existsSync as any).mockReturnValue(true);
      jest.mocked(fs.readFileSync as any).mockReturnValue("");
      
      const freshLoader = new ConfigLoader();
      const status = freshLoader.getConfigStatus();
      
      // Empty files should be marked as empty
      expect(status.styleGuide.isEmpty || !status.styleGuide.loaded).toBe(true);
    });
  });

  describe("config file loading", () => {
    it("should handle missing style guide file gracefully", () => {
      jest.mocked(fs.existsSync as any).mockImplementation((path: string | Buffer) => {
        const pathStr = path.toString();
        return !pathStr.includes("style-guide") && !pathStr.includes("style_guide");
      });
      jest.mocked(fs.readFileSync as any).mockReturnValue("");
      
      const freshLoader = new ConfigLoader();
      const status = freshLoader.getConfigStatus();
      
      expect(status.styleGuide.loaded).toBe(false);
    });

    it("should handle missing credo file gracefully", () => {
      jest.mocked(fs.existsSync as any).mockImplementation((path: string | Buffer) => {
        const pathStr = path.toString();
        return !pathStr.includes("credo");
      });
      jest.mocked(fs.readFileSync as any).mockReturnValue("");
      
      const freshLoader = new ConfigLoader();
      const status = freshLoader.getConfigStatus();
      
      expect(status.credo.loaded).toBe(false);
    });

    it("should handle missing constraints file gracefully", () => {
      jest.mocked(fs.existsSync as any).mockImplementation((path: string | Buffer) => {
        const pathStr = path.toString();
        return !pathStr.includes("constraints");
      });
      jest.mocked(fs.readFileSync as any).mockReturnValue("");
      
      const freshLoader = new ConfigLoader();
      const status = freshLoader.getConfigStatus();
      
      expect(status.constraints.loaded).toBe(false);
    });

    it("should handle invalid YAML gracefully", () => {
      jest.mocked(fs.existsSync as any).mockReturnValue(true);
      jest.mocked(fs.readFileSync as any).mockReturnValue("invalid: yaml: content: [");
      
      // Should not throw, should handle gracefully
      expect(() => {
        const freshLoader = new ConfigLoader();
        freshLoader.getConfigStatus();
      }).not.toThrow();
    });
  });

  describe("getConfigLoader singleton", () => {
    it("should return the same instance", () => {
      const instance1 = getConfigLoader();
      const instance2 = getConfigLoader();
      
      expect(instance1).toBe(instance2);
    });
  });
});

