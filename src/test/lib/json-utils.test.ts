/**
 * Tests for JSON utility functions
 * Tests edge cases and error paths to improve branch coverage
 */

import { describe, it, expect } from "@jest/globals";
import { safeJsonParse, safeJsonParseArray, safeJsonStringify } from "~/lib/json-utils";

describe("json-utils", () => {
  describe("safeJsonParse", () => {
    it("should parse valid JSON", () => {
      const result = safeJsonParse('{"key": "value"}', {});
      expect(result).toEqual({ key: "value" });
    });

    it("should return default value for null input", () => {
      const result = safeJsonParse(null, { default: "value" });
      expect(result).toEqual({ default: "value" });
    });

    it("should return default value for undefined input", () => {
      const result = safeJsonParse(undefined, { default: "value" });
      expect(result).toEqual({ default: "value" });
    });

    it("should return default value for empty string", () => {
      const result = safeJsonParse("", { default: "value" });
      expect(result).toEqual({ default: "value" });
    });

    it("should return default value for invalid JSON", () => {
      const result = safeJsonParse("invalid json", { default: "value" });
      expect(result).toEqual({ default: "value" });
    });

    it("should return default value for malformed JSON", () => {
      const result = safeJsonParse('{"key": "value"', { default: "value" });
      expect(result).toEqual({ default: "value" });
    });

    it("should handle nested objects", () => {
      const result = safeJsonParse('{"nested": {"key": "value"}}', {});
      expect(result).toEqual({ nested: { key: "value" } });
    });

    it("should handle arrays", () => {
      const result = safeJsonParse('[1, 2, 3]', []);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("safeJsonParseArray", () => {
    it("should parse valid JSON array", () => {
      const result = safeJsonParseArray('[1, 2, 3]', []);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should return default value for null input", () => {
      const result = safeJsonParseArray(null, ["default"]);
      expect(result).toEqual(["default"]);
    });

    it("should return default value for undefined input", () => {
      const result = safeJsonParseArray(undefined, ["default"]);
      expect(result).toEqual(["default"]);
    });

    it("should return default value for empty string", () => {
      const result = safeJsonParseArray("", ["default"]);
      expect(result).toEqual(["default"]);
    });

    it("should return default value for invalid JSON", () => {
      const result = safeJsonParseArray("invalid json", []);
      expect(result).toEqual([]);
    });

    it("should return default value when parsed value is not an array", () => {
      const result = safeJsonParseArray('{"key": "value"}', []);
      expect(result).toEqual([]);
    });

    it("should return default value when parsed value is a string", () => {
      const result = safeJsonParseArray('"not an array"', []);
      expect(result).toEqual([]);
    });

    it("should return default value when parsed value is a number", () => {
      const result = safeJsonParseArray("123", []);
      expect(result).toEqual([]);
    });

    it("should handle empty array", () => {
      const result = safeJsonParseArray("[]", ["default"]);
      expect(result).toEqual([]);
    });

    it("should handle array with mixed types", () => {
      const result = safeJsonParseArray('[1, "two", true, null]', []);
      expect(result).toEqual([1, "two", true, null]);
    });
  });

  describe("safeJsonStringify", () => {
    it("should stringify valid object", () => {
      const result = safeJsonStringify({ key: "value" }, "{}");
      expect(result).toBe('{"key":"value"}');
    });

    it("should stringify arrays", () => {
      const result = safeJsonStringify([1, 2, 3], "[]");
      expect(result).toBe("[1,2,3]");
    });

    it("should return default value for circular reference", () => {
      const circular: any = { key: "value" };
      circular.self = circular;
      // Note: JSON.stringify actually throws for circular references, so this should return default
      const result = safeJsonStringify(circular, "{}");
      // The function should catch the error and return default
      expect(result).toBe("{}");
    });

    it("should handle undefined (JSON.stringify returns undefined for undefined)", () => {
      // JSON.stringify(undefined) returns undefined (not a string)
      // The function should handle this gracefully
      const result = safeJsonStringify(undefined, "default");
      // Note: JSON.stringify(undefined) returns undefined, not a string
      // So the function may return "undefined" as a string or the default
      expect(typeof result).toBe("string");
    });

    it("should handle null", () => {
      const result = safeJsonStringify(null, "default");
      expect(result).toBe("null");
    });

    it("should handle primitives", () => {
      expect(safeJsonStringify(123, "default")).toBe("123");
      expect(safeJsonStringify("string", "default")).toBe('"string"');
      expect(safeJsonStringify(true, "default")).toBe("true");
    });

    it("should handle nested objects", () => {
      const result = safeJsonStringify({ nested: { key: "value" } }, "{}");
      expect(result).toContain("nested");
      expect(result).toContain("key");
      expect(result).toContain("value");
    });
  });
});
