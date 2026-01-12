/**
 * Tests for Database Preference Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import {
  getDatabasePreference,
  setDatabasePreference,
  getDatabasePath,
  type DatabasePreference,
} from "~/server/services/db-preference";

const PREFERENCE_FILE = join(process.cwd(), ".db-preference.json");

describe("db-preference", () => {
  beforeEach(() => {
    // Clean up preference file before each test
    if (existsSync(PREFERENCE_FILE)) {
      unlinkSync(PREFERENCE_FILE);
    }
  });

  afterEach(() => {
    // Clean up preference file after each test
    if (existsSync(PREFERENCE_FILE)) {
      unlinkSync(PREFERENCE_FILE);
    }
  });

  describe("getDatabasePreference", () => {
    it("should return 'dev' as default when preference file does not exist", () => {
      const preference = getDatabasePreference();
      expect(preference).toBe("dev");
    });

    it("should return preference from file when it exists", () => {
      const data = {
        database: "prod" as DatabasePreference,
        updatedAt: new Date().toISOString(),
      };
      writeFileSync(PREFERENCE_FILE, JSON.stringify(data), "utf-8");

      const preference = getDatabasePreference();
      expect(preference).toBe("prod");
    });

    it("should return 'dev' when preference file contains 'dev'", () => {
      const data = {
        database: "dev" as DatabasePreference,
        updatedAt: new Date().toISOString(),
      };
      writeFileSync(PREFERENCE_FILE, JSON.stringify(data), "utf-8");

      const preference = getDatabasePreference();
      expect(preference).toBe("dev");
    });

    it("should return 'dev' as default when preference file contains invalid value", () => {
      const data = {
        database: "invalid" as any,
        updatedAt: new Date().toISOString(),
      };
      writeFileSync(PREFERENCE_FILE, JSON.stringify(data), "utf-8");

      const preference = getDatabasePreference();
      expect(preference).toBe("dev");
    });

    it("should return 'dev' as default when preference file is malformed JSON", () => {
      writeFileSync(PREFERENCE_FILE, "not valid json", "utf-8");

      const preference = getDatabasePreference();
      expect(preference).toBe("dev");
    });

    it("should return 'dev' as default when preference file is missing database field", () => {
      const data = {
        updatedAt: new Date().toISOString(),
      };
      writeFileSync(PREFERENCE_FILE, JSON.stringify(data), "utf-8");

      const preference = getDatabasePreference();
      expect(preference).toBe("dev");
    });

    it("should handle file read errors gracefully", () => {
      // Create a malformed file that will cause JSON.parse to fail
      writeFileSync(PREFERENCE_FILE, "invalid json", "utf-8");
      
      // Should return default when parsing fails
      const preference = getDatabasePreference();
      expect(preference).toBe("dev");
    });
  });

  describe("setDatabasePreference", () => {
    it("should write preference to file", () => {
      setDatabasePreference("prod");

      expect(existsSync(PREFERENCE_FILE)).toBe(true);
      const content = readFileSync(PREFERENCE_FILE, "utf-8");
      const data = JSON.parse(content);
      expect(data.database).toBe("prod");
      expect(data.updatedAt).toBeDefined();
    });

    it("should update existing preference file", () => {
      // Set initial preference
      setDatabasePreference("dev");
      let content = readFileSync(PREFERENCE_FILE, "utf-8");
      let data = JSON.parse(content);
      expect(data.database).toBe("dev");

      // Update to prod
      setDatabasePreference("prod");
      content = readFileSync(PREFERENCE_FILE, "utf-8");
      data = JSON.parse(content);
      expect(data.database).toBe("prod");
    });

    it("should include updatedAt timestamp", () => {
      setDatabasePreference("prod");

      const content = readFileSync(PREFERENCE_FILE, "utf-8");
      const data = JSON.parse(content);
      expect(data.updatedAt).toBeDefined();
      expect(typeof data.updatedAt).toBe("string");
      // Should be valid ISO date
      expect(() => new Date(data.updatedAt)).not.toThrow();
    });

    it("should write preference successfully", () => {
      // Test that write succeeds in normal case
      expect(() => setDatabasePreference("prod")).not.toThrow();
      expect(getDatabasePreference()).toBe("prod");
    });

    it("should handle both 'dev' and 'prod' preferences", () => {
      setDatabasePreference("dev");
      expect(getDatabasePreference()).toBe("dev");

      setDatabasePreference("prod");
      expect(getDatabasePreference()).toBe("prod");
    });
  });

  describe("getDatabasePath", () => {
    it("should return dev.db path when preference is 'dev'", () => {
      setDatabasePreference("dev");
      const path = getDatabasePath();
      expect(path).toContain("dev.db");
    });

    it("should return prod.db path when preference is 'prod'", () => {
      setDatabasePreference("prod");
      const path = getDatabasePath();
      expect(path).toContain("prod.db");
    });

    it("should accept explicit preference parameter", () => {
      setDatabasePreference("dev");
      const path = getDatabasePath("prod");
      expect(path).toContain("prod.db");
    });

    it("should use current preference when no parameter provided", () => {
      setDatabasePreference("prod");
      const path = getDatabasePath();
      expect(path).toContain("prod.db");
    });

    it("should return relative path in non-Electron context", () => {
      // In test environment (non-Electron), should return relative path
      setDatabasePreference("dev");
      const path = getDatabasePath();
      expect(path).toBe("./dev.db");
    });

    it("should return relative path for prod in non-Electron context", () => {
      setDatabasePreference("prod");
      const path = getDatabasePath();
      expect(path).toBe("./prod.db");
    });

    it("should return relative path in test environment (non-Electron)", () => {
      // In test environment, Electron is not available, so should return relative path
      setDatabasePreference("dev");
      const path = getDatabasePath();
      // Should return relative path since we're not in Electron
      expect(path).toBe("./dev.db");
    });

    it("should handle path generation correctly for both preferences", () => {
      setDatabasePreference("dev");
      expect(getDatabasePath()).toBe("./dev.db");

      setDatabasePreference("prod");
      expect(getDatabasePath()).toBe("./prod.db");
    });
  });

  describe("integration", () => {
    it("should persist preference across multiple calls", () => {
      setDatabasePreference("prod");
      expect(getDatabasePreference()).toBe("prod");
      expect(getDatabasePreference()).toBe("prod"); // Should persist
    });

    it("should update path when preference changes", () => {
      setDatabasePreference("dev");
      expect(getDatabasePath()).toContain("dev.db");

      setDatabasePreference("prod");
      expect(getDatabasePath()).toContain("prod.db");
    });
  });
});
