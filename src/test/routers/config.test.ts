import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "@jest/globals";
import {
  createTestDb,
  createTestCaller,
  cleanupTestData,
  migrateTestDb,
  closeTestDb,
} from "../test-utils";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getConfigLoader } from "~/server/services/config";

describe("Config Router", () => {
  const db = createTestDb();
  const caller = createTestCaller(db);
  const configDir = path.join(process.cwd(), "config");
  
  // Backup original config files to restore after tests
  const originalFiles: Record<string, string | null> = {};

  beforeAll(async () => {
    await migrateTestDb(db);
    
    // Backup original config files before any tests run
    const files = ["style_guide.yaml", "credo.yaml", "constraints.yaml"];
    for (const file of files) {
      const filePath = path.join(configDir, file);
      if (fs.existsSync(filePath)) {
        originalFiles[file] = fs.readFileSync(filePath, "utf-8");
      } else {
        originalFiles[file] = null;
      }
    }
  });

  beforeEach(async () => {
    await cleanupTestData(db);
  });
  
  afterEach(() => {
    // Restore original config files after each test that modifies them
    const files = ["style_guide.yaml", "credo.yaml", "constraints.yaml"];
    for (const file of files) {
      const filePath = path.join(configDir, file);
      if (originalFiles[file] !== null) {
        fs.writeFileSync(filePath, originalFiles[file]!, "utf-8");
      } else if (fs.existsSync(filePath)) {
        // If file didn't exist originally, delete it
        fs.unlinkSync(filePath);
      }
    }
    
    // Reload configs to reflect restored files
    getConfigLoader().reloadConfigs();
  });

  afterAll(async () => {
    await cleanupTestData(db);
    closeTestDb(db);
    
    // Final restore of original files
    const files = ["style_guide.yaml", "credo.yaml", "constraints.yaml"];
    for (const file of files) {
      const filePath = path.join(configDir, file);
      if (originalFiles[file] !== null) {
        fs.writeFileSync(filePath, originalFiles[file]!, "utf-8");
      } else if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    getConfigLoader().reloadConfigs();
  });

  test("should get style guide raw content", async () => {
    const result = await caller.config.getStyleGuideRaw();
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
  });

  test("should get credo raw content", async () => {
    const result = await caller.config.getCredoRaw();
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
  });

  test("should get constraints raw content", async () => {
    const result = await caller.config.getConstraintsRaw();
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
  });

  test("should get parsed style guide", async () => {
    const result = await caller.config.getStyleGuide();
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  test("should get parsed credo", async () => {
    const result = await caller.config.getCredo();
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  test("should get parsed constraints", async () => {
    const result = await caller.config.getConstraints();
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  test("should update style guide with valid YAML", async () => {
    const testYaml = `voice:
  tone: "test tone"
  personality: "test personality"
`;
    
    const result = await caller.config.updateStyleGuide({ content: testYaml });
    expect(result.success).toBe(true);
    
    // Verify file was written
    const styleGuidePath = path.join(configDir, "style_guide.yaml");
    if (fs.existsSync(styleGuidePath)) {
      const content = fs.readFileSync(styleGuidePath, "utf-8");
      expect(content).toContain("test tone");
    }
    
    // Verify parsed content reflects the update
    const styleGuide = await caller.config.getStyleGuide();
    expect(styleGuide.voice?.tone).toBe("test tone");
  });

  test("should update credo with valid YAML", async () => {
    const testYaml = `core_beliefs:
  - "Test belief 1"
  - "Test belief 2"
`;
    
    const result = await caller.config.updateCredo({ content: testYaml });
    expect(result.success).toBe(true);
    
    // Verify file was written
    const credoPath = path.join(configDir, "credo.yaml");
    if (fs.existsSync(credoPath)) {
      const content = fs.readFileSync(credoPath, "utf-8");
      expect(content).toContain("Test belief 1");
    }
    
    // Verify parsed content reflects the update
    const credo = await caller.config.getCredo();
    expect(credo.core_beliefs).toContain("Test belief 1");
  });

  test("should update constraints with valid YAML", async () => {
    const testYaml = `never_do:
  - "Test rule 1"
  - "Test rule 2"
`;
    
    const result = await caller.config.updateConstraints({ content: testYaml });
    expect(result.success).toBe(true);
    
    // Verify file was written
    const constraintsPath = path.join(configDir, "constraints.yaml");
    if (fs.existsSync(constraintsPath)) {
      const content = fs.readFileSync(constraintsPath, "utf-8");
      expect(content).toContain("Test rule 1");
    }
    
    // Verify parsed content reflects the update
    const constraints = await caller.config.getConstraints();
    expect(constraints.never_do).toContain("Test rule 1");
  });

  test("should reject invalid YAML when updating style guide", async () => {
    const invalidYaml = `voice:
  tone: "unclosed string
`;
    
    await expect(
      caller.config.updateStyleGuide({ content: invalidYaml })
    ).rejects.toThrow("Invalid YAML");
  });

  test("should reject invalid YAML when updating credo", async () => {
    const invalidYaml = `core_beliefs:
  - "unclosed string
`;
    
    await expect(
      caller.config.updateCredo({ content: invalidYaml })
    ).rejects.toThrow("Invalid YAML");
  });

  test("should reject invalid YAML when updating constraints", async () => {
    const invalidYaml = `never_do:
  - "unclosed string
`;
    
    await expect(
      caller.config.updateConstraints({ content: invalidYaml })
    ).rejects.toThrow("Invalid YAML");
  });

  test("should reload configs after update", async () => {
    const testYaml = `voice:
  tone: "reload test tone"
`;
    
    // Update style guide
    await caller.config.updateStyleGuide({ content: testYaml });
    
    // Get parsed style guide - should reflect the update
    const styleGuide = await caller.config.getStyleGuide();
    expect(styleGuide).toBeDefined();
    
    // The reload should have happened, so new content should be available
    const rawContent = await caller.config.getStyleGuideRaw();
    expect(rawContent.content).toContain("reload test tone");
  });
});

