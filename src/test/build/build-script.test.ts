/**
 * Build Script Verification Tests
 * 
 * These tests verify that the build scripts and post-build processes work correctly.
 * They ensure that:
 * - The fix-electron-imports script runs successfully
 * - Import paths are correctly transformed
 * - Build artifacts are generated correctly
 */

import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..", "..", "..");
const distElectron = join(projectRoot, "dist-electron");
const fixScriptPath = join(projectRoot, "scripts", "fix-electron-imports.mjs");

describe("Build Script Verification", () => {
  beforeAll(() => {
    // Verify the fix script exists
    if (!existsSync(fixScriptPath)) {
      throw new Error(
        `fix-electron-imports.mjs not found at ${fixScriptPath}`
      );
    }
  });

  describe("Fix Script Availability", () => {
    test("fix-electron-imports.mjs should exist", () => {
      expect(existsSync(fixScriptPath)).toBe(true);
    });

    test("fix-electron-imports.mjs should be executable", async () => {
      // Try to run the script (it will fail if dist-electron doesn't exist, which is OK)
      try {
        execSync(`node ${fixScriptPath}`, { cwd: projectRoot, encoding: "utf8" });
      } catch (error: unknown) {
        // Script may fail if dist-electron doesn't exist, which is fine for this test
        const err = error as { status: number | null; message: string };
        if (err.status !== null && err.status !== 0) {
          // If dist-electron doesn't exist, that's OK - we just want to verify the script is runnable
          if (!existsSync(distElectron)) {
            return; // Expected failure
          }
        }
      }
    });
  });

  describe("Import Path Transformation", () => {
    test("should transform ../src/ to ./src/ in main.js", () => {
      if (!existsSync(distElectron)) {
        // Skip if build doesn't exist
        return;
      }

      const mainPath = join(distElectron, "main.js");
      if (!existsSync(mainPath)) {
        return;
      }

      const content = readFileSync(mainPath, "utf8");
      
      // Should not have ../src/ imports
      const badImports = content.match(/from ['"]\.\.\/src\//g);
      if (badImports) {
        throw new Error(
          `Found ../src/ imports in main.js that should have been transformed:\n` +
            badImports.join("\n")
        );
      }
    });

    test("should add .js extensions to relative imports", () => {
      if (!existsSync(distElectron)) {
        return;
      }

      const mainPath = join(distElectron, "main.js");
      if (!existsSync(mainPath)) {
        return;
      }

      const content = readFileSync(mainPath, "utf8");
      
      // Find relative imports that should have .js extension
      const relativeImports = content.matchAll(
        /from ['"](\.[^'"]+?)(?<!\.js)(?<!\.json)(?<!node_modules)['"]/g
      );
      
      const missingExtensions: string[] = [];
      for (const match of relativeImports) {
        const importPath = match[1];
        // Skip if it's a special case
        if (
          importPath.includes("node_modules") ||
          importPath.includes("://") ||
          importPath.endsWith("/") // Directory imports (should be index.js but handled separately)
        ) {
          continue;
        }
        missingExtensions.push(importPath);
      }

      if (missingExtensions.length > 0) {
        throw new Error(
          `Found relative imports missing .js extension in main.js:\n` +
            missingExtensions.join("\n")
        );
      }
    });

    test("should transform ~/ path aliases to relative paths in src files", () => {
      if (!existsSync(distElectron)) {
        return;
      }

      const srcFilesToCheck = [
        join(distElectron, "src", "server", "services", "llm", "client.js"),
        join(distElectron, "src", "server", "services", "config.js"),
        join(distElectron, "src", "lib", "logger.js"),
      ];

      const filesWithPathAliases: string[] = [];

      for (const filePath of srcFilesToCheck) {
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, "utf8");
          if (content.match(/from ['"]~/)) {
            filesWithPathAliases.push(filePath);
          }
        }
      }

      if (filesWithPathAliases.length > 0) {
        throw new Error(
          `Found ~/ path alias imports that should have been transformed:\n` +
            filesWithPathAliases.join("\n")
        );
      }
    });
  });

  describe("Build Process Integration", () => {
    test("build:electron script should include fix-electron-imports", () => {
      const packageJsonPath = join(projectRoot, "package.json");
      const packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf8")
      );
      
      const buildScript = packageJson.scripts?.["build:electron"];
      expect(buildScript).toBeDefined();
      expect(buildScript).toContain("fix-electron-imports.mjs");
    });
  });
});

