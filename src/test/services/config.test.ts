/**
 * Tests for config service
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import path from "path";

// Mock fs only (don't mock path - it's a built-in Node.js module)
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.mock("fs", () => {
  const actualFs = jest.requireActual("fs");
  const mockFs = Object.assign({}, actualFs, {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  });
  return {
    __esModule: true,
    default: mockFs,
    ...mockFs,
  };
});

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
  let ConfigLoader: any;
  let getConfigLoader: any;
  let configLoader: any;
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

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset mocks to default state
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
    
    // Mock fs.existsSync to return true for config files
    mockExistsSync.mockReturnValue(true);

    // Mock fs.readFileSync to return YAML content
    mockReadFileSync.mockImplementation((filePath) => {
      const pathStr = String(filePath);
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

    // Import ConfigLoader AFTER mocks are set up
    const configModule = await import("~/server/services/config");
    ConfigLoader = configModule.ConfigLoader;
    getConfigLoader = configModule.getConfigLoader;
    
    // Create a mock fs object with our mocked functions
    const mockFs = {
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync,
    } as any;
    configLoader = new ConfigLoader(mockFs);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSystemPrompt", () => {
    it("should return original prompt when no style guide is loaded", async () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockReturnValue("");
      // Create a mock fs object with our mocked functions
      const mockFs = {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
      } as any;
      const freshLoader = new ConfigLoader(mockFs);
      
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
      // Clear previous calls to get accurate count
      mockReadFileSync.mockClear();
      
      configLoader.reloadConfigs();
      
      // Should read config files again (at least 3 files: style guide, credo, constraints)
      expect(mockReadFileSync).toHaveBeenCalled();
      expect(mockReadFileSync.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getConfigStatus", () => {
    it("should return status for all config files", async () => {
      mockExistsSync.mockReturnValue(true);
      
      const status = configLoader.getConfigStatus();
      
      expect(status).toHaveProperty("styleGuide");
      expect(status).toHaveProperty("credo");
      expect(status).toHaveProperty("constraints");
      expect(status.styleGuide).toHaveProperty("loaded");
      expect(status.styleGuide).toHaveProperty("isEmpty");
    });

    it("should indicate when config files are missing", async () => {
      // Completely reset mocks for this test
      mockExistsSync.mockReset();
      mockReadFileSync.mockReset();
      
      // Files don't exist - set up before creating loader
      // getConfigStatus checks existsSync, so we need to mock it
      // #region agent log
      (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'config.test.ts:137',message:'Before setting mockReturnValue',data:{mockExistsSyncType:typeof mockExistsSync,isMock:!!mockExistsSync.mockReturnValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})+"\n"); } catch {} })();
      // #endregion
      mockExistsSync.mockReturnValue(false);
      // #region agent log
      (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'config.test.ts:140',message:'After setting mockReturnValue(false)',data:{mockReturnValue:mockExistsSync.getMockImplementation?.()?.()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})+"\n"); } catch {} })();
      // #endregion
      // readFileSync won't be called if files don't exist (loadConfigs checks existsSync first)
      
      // Create a mock fs object with our mocked functions
      const mockFs = {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
      } as any;
      const freshLoader = new ConfigLoader(mockFs);
      // #region agent log
      (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'config.test.ts:145',message:'After creating ConfigLoader',data:{styleGuideKeys:Object.keys(freshLoader.getStyleGuide()).length,credoKeys:Object.keys(freshLoader.getCredo()).length,constraintsKeys:Object.keys(freshLoader.getConstraints()).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})+"\n"); } catch {} })();
      // #endregion
      // After construction, the internal objects are {} (empty)
      // Now getConfigStatus will check existsSync again
      mockExistsSync.mockReturnValue(false); // Ensure it's still false
      // #region agent log
      (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'config.test.ts:149',message:'Before getConfigStatus call',data:{mockReturnValue:mockExistsSync.getMockImplementation?.()?.()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})+"\n"); } catch {} })();
      // #endregion
      const status = freshLoader.getConfigStatus();
      // #region agent log
      (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'config.test.ts:152',message:'After getConfigStatus call',data:{styleGuideLoaded:status.styleGuide.loaded,styleGuideEmpty:status.styleGuide.isEmpty,credoLoaded:status.credo.loaded,constraintsLoaded:status.constraints.loaded},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})+"\n"); } catch {} })();
      // #endregion
      
      // Since files don't exist, they should be marked as not loaded/empty
      // loaded = exists && Object.keys().length > 0 = false && false = false
      // isEmpty = !loaded || Object.keys().length === 0 = true || true = true
      expect(status.styleGuide.loaded).toBe(false);
      expect(status.styleGuide.isEmpty).toBe(true);
      expect(status.credo.loaded).toBe(false);
      expect(status.credo.isEmpty).toBe(true);
      expect(status.constraints.loaded).toBe(false);
      expect(status.constraints.isEmpty).toBe(true);
    });

    it("should indicate when config files are empty", async () => {
      // Completely reset mocks for this test
      mockExistsSync.mockReset();
      mockReadFileSync.mockReset();
      
      // Files exist but are empty - set up before creating loader
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(""); // Empty YAML becomes {} after yaml.load("") ?? {}
      
      // Create a mock fs object with our mocked functions
      const mockFs = {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
      } as any;
      const freshLoader = new ConfigLoader(mockFs);
      // After construction, the internal objects are {} (empty) because yaml.load("") returns null
      // Now getConfigStatus will check existsSync again
      mockExistsSync.mockReturnValue(true); // Ensure it's still true
      const status = freshLoader.getConfigStatus();
      
      // Empty files (yaml.load("") returns null, becomes {}) should be marked as not loaded/empty
      // loaded = exists && Object.keys({}).length > 0 = true && false = false
      // isEmpty = !loaded || Object.keys({}).length === 0 = true || true = true
      expect(status.styleGuide.loaded).toBe(false); // Object.keys({}).length === 0
      expect(status.styleGuide.isEmpty).toBe(true);
      expect(status.credo.loaded).toBe(false);
      expect(status.credo.isEmpty).toBe(true);
      expect(status.constraints.loaded).toBe(false);
      expect(status.constraints.isEmpty).toBe(true);
    });
  });

  describe("config file loading", () => {
    it("should handle missing style guide file gracefully", async () => {
      // Completely reset mocks
      mockExistsSync.mockReset();
      mockReadFileSync.mockReset();
      
      // Set up mocks before creating loader - style guide doesn't exist, others do
      mockExistsSync.mockImplementation((path) => {
        const pathStr = String(path);
        return !pathStr.includes("style-guide") && !pathStr.includes("style_guide");
      });
      mockReadFileSync.mockReturnValue(""); // Won't be called for style guide, but set for others
      
      // Create a mock fs object with our mocked functions
      const mockFs = {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
      } as any;
      const freshLoader = new ConfigLoader(mockFs);
      // getConfigStatus checks existsSync again - ensure mock is still active
      const status = freshLoader.getConfigStatus();
      
      expect(status.styleGuide.loaded).toBe(false);
      expect(status.styleGuide.isEmpty).toBe(true);
    });

    it("should handle missing credo file gracefully", async () => {
      // Completely reset mocks
      mockExistsSync.mockReset();
      mockReadFileSync.mockReset();
      
      // Set up mocks before creating loader - credo doesn't exist, others do
      mockExistsSync.mockImplementation((path) => {
        const pathStr = String(path);
        return !pathStr.includes("credo");
      });
      mockReadFileSync.mockReturnValue("");
      
      // Create a mock fs object with our mocked functions
      const mockFs = {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
      } as any;
      const freshLoader = new ConfigLoader(mockFs);
      // getConfigStatus checks existsSync again - ensure mock is still active
      const status = freshLoader.getConfigStatus();
      
      expect(status.credo.loaded).toBe(false);
      expect(status.credo.isEmpty).toBe(true);
    });

    it("should handle missing constraints file gracefully", async () => {
      // Completely reset mocks
      mockExistsSync.mockReset();
      mockReadFileSync.mockReset();
      
      // Set up mocks before creating loader - constraints doesn't exist, others do
      mockExistsSync.mockImplementation((path) => {
        const pathStr = String(path);
        return !pathStr.includes("constraints");
      });
      mockReadFileSync.mockReturnValue("");
      
      // Create a mock fs object with our mocked functions
      const mockFs = {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
      } as any;
      const freshLoader = new ConfigLoader(mockFs);
      // getConfigStatus checks existsSync again - ensure mock is still active
      const status = freshLoader.getConfigStatus();
      
      expect(status.constraints.loaded).toBe(false);
      expect(status.constraints.isEmpty).toBe(true);
    });

    it("should handle invalid YAML gracefully", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid: yaml: content: [");
      
      // Should not throw, should handle gracefully
      // Create a mock fs object with our mocked functions
      const mockFs = {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
      } as any;
      const freshLoader = new ConfigLoader(mockFs);
      expect(() => {
        freshLoader.getConfigStatus();
      }).not.toThrow();
    });
  });

  describe("getConfigLoader singleton", () => {
    it("should return the same instance", async () => {
      const instance1 = getConfigLoader();
      const instance2 = getConfigLoader();
      
      expect(instance1).toBe(instance2);
    });
  });
});

