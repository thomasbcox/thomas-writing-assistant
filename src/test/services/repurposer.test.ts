import { describe, it, expect, beforeEach } from "@jest/globals";
import { repurposeAnchorContent } from "~/server/services/repurposer";
import { MockLLMClient, type LLMClient } from "../mocks/llm-client";
import { MockConfigLoader, type ConfigLoader } from "../mocks/config-loader";

describe("repurposer", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;

  beforeEach(() => {
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader();
  });

  it("should repurpose content into all formats", async () => {
    const mockResponse = {
      social_posts: ["Post 1", "Post 2", "Post 3"],
      email: "Full email content here",
      lead_magnet: "Lead magnet description",
      pinterest_pins: ["Pin 1", "Pin 2"],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await repurposeAnchorContent(
      "Test Anchor Title",
      "Test anchor content",
      ["Pain point 1", "Pain point 2"],
      ["Step 1", "Step 2"],
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result).toHaveLength(7); // 3 social posts + 1 email + 1 lead magnet + 2 pins
    expect(result.filter((r) => r.type === "social_post")).toHaveLength(3);
    expect(result.filter((r) => r.type === "email")).toHaveLength(1);
    expect(result.filter((r) => r.type === "lead_magnet")).toHaveLength(1);
    expect(result.filter((r) => r.type === "pinterest_pin")).toHaveLength(2);
  });

  it("should handle missing content types gracefully", async () => {
    const mockResponse = {
      social_posts: ["Post 1"],
      // Missing email, lead_magnet, pinterest_pins
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await repurposeAnchorContent(
      "Test Title",
      "Test content",
      null,
      null,
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("social_post");
  });

  it("should include pain points and solution steps in prompt", async () => {
    let capturedPrompt = "";
    const mockResponse = {
      social_posts: ["Post 1"],
      email: "Email content",
      lead_magnet: "Lead magnet",
      pinterest_pins: ["Pin 1"],
    };

    mockLLMClient.setMockCompleteJSON(async (prompt) => {
      capturedPrompt = prompt;
      return mockResponse;
    });
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    await repurposeAnchorContent(
      "Test Title",
      "Test content",
      ["Pain 1", "Pain 2"],
      ["Step 1", "Step 2"],
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(capturedPrompt).toContain("Pain 1");
    expect(capturedPrompt).toContain("Pain 2");
    expect(capturedPrompt).toContain("Step 1");
    expect(capturedPrompt).toContain("Step 2");
  });

  it("should throw error when LLM fails", async () => {
    mockLLMClient.setMockCompleteJSON(async () => {
      throw new Error("LLM API error");
    });
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    await expect(
      repurposeAnchorContent(
        "Test Title",
        "Test content",
        null,
        null,
        mockLLMClient as unknown as LLMClient,
        mockConfigLoader as unknown as ConfigLoader,
      )
    ).rejects.toThrow("Failed to repurpose content");
  });

  it("should handle empty response", async () => {
    mockLLMClient.setMockCompleteJSON(async () => ({}));
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await repurposeAnchorContent(
      "Test Title",
      "Test content",
      null,
      null,
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result).toHaveLength(0);
  });

  it("should handle partial response (only some content types)", async () => {
    const mockResponse = {
      social_posts: ["Post 1"],
      email: "Email content",
      // Missing lead_magnet and pinterest_pins
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await repurposeAnchorContent(
      "Test Title",
      "Test content",
      null,
      null,
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result.length).toBe(2);
    expect(result.filter((r) => r.type === "social_post")).toHaveLength(1);
    expect(result.filter((r) => r.type === "email")).toHaveLength(1);
  });

  it("should handle invalid response structure", async () => {
    const mockResponse = {
      social_posts: "not an array", // Invalid - should be array
      email: null, // Invalid - should be string
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await repurposeAnchorContent(
      "Test Title",
      "Test content",
      null,
      null,
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    // Should handle invalid structure gracefully
    expect(Array.isArray(result)).toBe(true);
  });

  it("should handle very long anchor content", async () => {
    const longContent = "x".repeat(50000); // 50k characters
    const mockResponse = {
      social_posts: ["Post 1"],
      email: "Email",
      lead_magnet: "Lead magnet",
      pinterest_pins: ["Pin 1"],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await repurposeAnchorContent(
      "Test Title",
      longContent,
      null,
      null,
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result.length).toBeGreaterThan(0);
  });

  it("should handle empty arrays for pain points and solution steps", async () => {
    const mockResponse = {
      social_posts: ["Post 1"],
      email: "Email",
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await repurposeAnchorContent(
      "Test Title",
      "Test content",
      [], // Empty array
      [], // Empty array
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result.length).toBeGreaterThan(0);
  });
});

