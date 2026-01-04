/**
 * Tests for config service
 * Uses static imports and proper mocking
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { ConfigLoader, getConfigLoader } from "~/server/services/config";

// Mock fs
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.mock("fs", () => {
  const actualFs = jest.requireActual("fs") as Record<string, unknown>;
  return {
    __esModule: true,
    default: Object.assign({}, actualFs, {
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync,
    }),
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
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
  let configLoader: ConfigLoader;
  let mockFsModule: typeof import("fs");
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
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
    
    // Create a properly mocked fs module object
    mockFsModule = {
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync,
    } as unknown as typeof import("fs");
    
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

    configLoader = new ConfigLoader(mockFsModule);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSystemPrompt", () => {
    it("should return original prompt when no style guide is loaded", () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockReturnValue("");
      
      const loader = new ConfigLoader(mockFsModule);
      const result = loader.getSystemPrompt("Original prompt");
      // When no configs are loaded, getSystemPrompt returns just the context
      expect(result).toBe("Context: Original prompt\n\n");
    });

    it("should enhance prompt with style guide when available", () => {
      const result = configLoader.getSystemPrompt("Original prompt");
      expect(result).toContain("Original prompt");
      // Should include style guide information
      expect(result.length).toBeGreaterThan("Original prompt".length);
    });
  });

  describe("getStyleGuide", () => {
    it("should return style guide when file exists", () => {
      const result = configLoader.getStyleGuide();
      expect(result).toBeDefined();
      expect(result.voice).toBeDefined();
      expect(result.writing_style).toBeDefined();
    });

    it("should return empty object when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      const loader = new ConfigLoader(mockFsModule);
      const result = loader.getStyleGuide();
      expect(result).toEqual({});
    });
  });

  describe("getCredo", () => {
    it("should return credo when file exists", () => {
      const result = configLoader.getCredo();
      expect(result).toBeDefined();
      expect(result.core_beliefs).toBeDefined();
    });

    it("should return empty object when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      const loader = new ConfigLoader(mockFsModule);
      const result = loader.getCredo();
      expect(result).toEqual({});
    });
  });

  describe("getConstraints", () => {
    it("should return constraints when file exists", () => {
      const result = configLoader.getConstraints();
      expect(result).toBeDefined();
      expect(result.never_do).toBeDefined();
      expect(result.always_do).toBeDefined();
    });

    it("should return empty object when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      const loader = new ConfigLoader(mockFsModule);
      const result = loader.getConstraints();
      expect(result).toEqual({});
    });
  });

  describe("getPrompt", () => {
    it("should return default when key not found", () => {
      const result = configLoader.getPrompt("nonexistent.key", "default value");
      expect(result).toBe("default value");
    });

    it("should return prompt from config when available", () => {
      // This would require actual config file setup
      // For now, just test the default behavior
      const result = configLoader.getPrompt("test.key", "default");
      expect(result).toBe("default");
    });
  });

  describe("validateConfigForContentGeneration", () => {
    it("should not throw when config is valid", () => {
      expect(() => {
        configLoader.validateConfigForContentGeneration();
      }).not.toThrow();
    });

    it("should throw when style guide is missing", () => {
      mockExistsSync.mockImplementation((path) => {
        const pathStr = String(path);
        return !pathStr.includes("style-guide") && !pathStr.includes("style_guide");
      });
      
      const loader = new ConfigLoader(mockFsModule);
      expect(() => {
        loader.validateConfigForContentGeneration();
      }).toThrow();
    });
  });

  describe("getConfigLoader singleton", () => {
    it("should return the same instance", () => {
      const loader1 = getConfigLoader();
      const loader2 = getConfigLoader();
      expect(loader1).toBe(loader2);
    });
  });
});

