/**
 * Tests for error message translation utility
 * Last Updated: 2025-12-11
 */

import { describe, test, expect } from "@jest/globals";
import { translateError, getRecoverySuggestion } from "~/lib/error-messages";

describe("Error Message Translation", () => {
  test("should translate model not found errors", () => {
    const error = new Error("Model not found: gemini-pro");
    const translated = translateError(error);
    
    expect(translated).toContain("AI model is temporarily unavailable");
    expect(translated).toContain("alternative model");
    expect(translated).toContain("Settings");
  });

  test("should translate 404 errors", () => {
    const error = new Error("404: models/gemini-pro is not found");
    const translated = translateError(error);
    
    expect(translated).toContain("AI model is temporarily unavailable");
  });

  test("should translate API key errors", () => {
    const error = new Error("Invalid API key");
    const translated = translateError(error);
    
    expect(translated).toContain("API key");
    expect(translated).toContain("Settings");
  });

  test("should translate authentication errors", () => {
    const error = new Error("Authentication failed");
    const translated = translateError(error);
    
    expect(translated).toContain("API key");
  });

  test("should translate rate limit errors", () => {
    const error = new Error("Rate limit exceeded");
    const translated = translateError(error);
    
    expect(translated).toContain("rate limit");
    expect(translated).toContain("try again");
  });

  test("should translate timeout errors", () => {
    const error = new Error("Request timed out");
    const translated = translateError(error);
    
    expect(translated).toContain("timed out");
    expect(translated).toContain("try again");
  });

  test("should translate PDF extraction errors", () => {
    const error = new Error("Failed to extract text from PDF");
    const translated = translateError(error);
    
    expect(translated).toContain("extract text from PDF");
    expect(translated).toContain("password-protected");
  });

  test("should translate PDF file errors", () => {
    const error = new Error("Invalid PDF file");
    const translated = translateError(error);
    
    expect(translated).toContain("PDF file");
    expect(translated).toContain("valid PDF");
  });

  test("should translate YAML errors", () => {
    const error = new Error("Invalid YAML syntax");
    const translated = translateError(error);
    
    expect(translated).toContain("Invalid YAML");
    expect(translated).toContain("syntax");
  });

  test("should translate config not found errors", () => {
    const error = new Error("Config file not found");
    const translated = translateError(error);
    
    expect(translated).toContain("Configuration file");
    expect(translated).toContain("default settings");
  });

  test("should translate database errors", () => {
    const error = new Error("Database connection failed");
    const translated = translateError(error);
    
    expect(translated).toContain("Database error");
    expect(translated).toContain("try again");
  });

  test("should translate network errors", () => {
    const error = new Error("Network error: fetch failed");
    const translated = translateError(error);
    
    expect(translated).toContain("Network error");
    expect(translated).toContain("internet connection");
  });

  test("should use context when provided", () => {
    const error = new Error("Some technical error");
    const translated = translateError(error, { operation: "create capsule" });
    
    expect(translated).toContain("create capsule");
  });

  test("should handle non-Error objects", () => {
    const translated = translateError("String error");
    expect(typeof translated).toBe("string");
    expect(translated.length).toBeGreaterThan(0);
  });

  test("should handle null/undefined errors", () => {
    const translated = translateError(null);
    expect(translated).toContain("unexpected error");
  });
});

describe("Recovery Suggestions", () => {
  test("should suggest API key update for API key errors", () => {
    const error = new Error("Invalid API key");
    const suggestion = getRecoverySuggestion(error);
    
    expect(suggestion).toContain("Settings");
    expect(suggestion).toContain("API key");
  });

  test("should suggest waiting for rate limit errors", () => {
    const error = new Error("Rate limit exceeded");
    const suggestion = getRecoverySuggestion(error);
    
    expect(suggestion).toContain("Wait");
  });

  test("should suggest alternative models for model not found", () => {
    const error = new Error("Model not found");
    const suggestion = getRecoverySuggestion(error);
    
    expect(suggestion).toContain("alternative models");
  });

  test("should suggest different PDF for PDF extraction errors", () => {
    const error = new Error("Failed to extract PDF");
    const suggestion = getRecoverySuggestion(error);
    
    expect(suggestion).toContain("PDF");
  });

  test("should return null for errors without specific suggestions", () => {
    const error = new Error("Some generic error");
    const suggestion = getRecoverySuggestion(error);
    
    expect(suggestion).toBeNull();
  });
});

