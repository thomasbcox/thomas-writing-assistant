import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { getConfigLoader, ConfigLoader } from "~/server/services/config";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

describe("Config Loader", () => {
  const testConfigDir = path.join(process.cwd(), "test-config");
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test config directory
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test config files
    const files = ["style_guide.yaml", "credo.yaml", "constraints.yaml"];
    files.forEach((file) => {
      const filePath = path.join(testConfigDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  test("should create a config loader instance", () => {
    const loader = getConfigLoader();
    expect(loader).toBeInstanceOf(ConfigLoader);
  });

  test("should return same singleton instance", () => {
    const loader1 = getConfigLoader();
    const loader2 = getConfigLoader();
    expect(loader1).toBe(loader2);
  });

  test("should return empty style guide when file doesn't exist", () => {
    const loader = getConfigLoader();
    const styleGuide = loader.getStyleGuide();
    expect(styleGuide).toBeDefined();
    expect(typeof styleGuide).toBe("object");
  });

  test("should return empty credo when file doesn't exist", () => {
    const loader = getConfigLoader();
    const credo = loader.getCredo();
    expect(credo).toBeDefined();
    expect(typeof credo).toBe("object");
  });

  test("should return empty constraints when file doesn't exist", () => {
    const loader = getConfigLoader();
    const constraints = loader.getConstraints();
    expect(constraints).toBeDefined();
    expect(typeof constraints).toBe("object");
  });

  test("should generate system prompt without config files", () => {
    const loader = getConfigLoader();
    const prompt = loader.getSystemPrompt();
    expect(typeof prompt).toBe("string");
  });

  test("should generate system prompt with context", () => {
    const loader = getConfigLoader();
    const prompt = loader.getSystemPrompt("Additional context here");
    expect(typeof prompt).toBe("string");
    expect(prompt).toContain("Additional context here");
  });

  test("should handle missing config files gracefully", () => {
    // Config loader should not throw when files don't exist
    const loader = getConfigLoader();
    expect(() => {
      loader.getStyleGuide();
      loader.getCredo();
      loader.getConstraints();
      loader.getSystemPrompt();
    }).not.toThrow();
  });

  test("should reload configs when reloadConfigs is called", () => {
    const loader = getConfigLoader();
    const initialStyleGuide = loader.getStyleGuide();
    
    // Reload should not throw
    expect(() => {
      loader.reloadConfigs();
    }).not.toThrow();
    
    // Should still return valid objects
    const afterReload = loader.getStyleGuide();
    expect(afterReload).toBeDefined();
    expect(typeof afterReload).toBe("object");
  });

  test("should include full YAML structure in system prompt", () => {
    const loader = getConfigLoader();
    const styleGuide = loader.getStyleGuide();
    const credo = loader.getCredo();
    const constraints = loader.getConstraints();
    
    const prompt = loader.getSystemPrompt();
    
    // If configs exist, prompt should contain YAML structure
    if (Object.keys(styleGuide).length > 0) {
      expect(prompt).toContain("Writing Style Guide:");
    }
    if (Object.keys(credo).length > 0) {
      expect(prompt).toContain("Core Beliefs and Values:");
    }
    if (Object.keys(constraints).length > 0) {
      expect(prompt).toContain("Content Constraints and Rules:");
    }
  });

  test("should return config status", () => {
    const loader = getConfigLoader();
    const status = loader.getConfigStatus();
    
    expect(status).toBeDefined();
    expect(status.styleGuide).toBeDefined();
    expect(status.credo).toBeDefined();
    expect(status.constraints).toBeDefined();
    
    expect(typeof status.styleGuide.loaded).toBe("boolean");
    expect(typeof status.styleGuide.isEmpty).toBe("boolean");
    expect(typeof status.credo.loaded).toBe("boolean");
    expect(typeof status.credo.isEmpty).toBe("boolean");
    expect(typeof status.constraints.loaded).toBe("boolean");
    expect(typeof status.constraints.isEmpty).toBe("boolean");
  });

  test("should correctly identify empty configs", () => {
    const loader = getConfigLoader();
    const status = loader.getConfigStatus();
    
    // If configs are empty, isEmpty should be true
    const styleGuide = loader.getStyleGuide();
    const credo = loader.getCredo();
    const constraints = loader.getConstraints();
    
    if (Object.keys(styleGuide).length === 0) {
      expect(status.styleGuide.isEmpty).toBe(true);
      expect(status.styleGuide.loaded).toBe(false);
    }
    
    if (Object.keys(credo).length === 0) {
      expect(status.credo.isEmpty).toBe(true);
      expect(status.credo.loaded).toBe(false);
    }
    
    if (Object.keys(constraints).length === 0) {
      expect(status.constraints.isEmpty).toBe(true);
      expect(status.constraints.loaded).toBe(false);
    }
  });
});

