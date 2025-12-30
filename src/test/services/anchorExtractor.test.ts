import { describe, it, expect, beforeEach } from "@jest/globals";
import { extractAnchorMetadata } from "~/server/services/anchorExtractor";
import { MockLLMClient, type LLMClient } from "../mocks/llm-client";
import { MockConfigLoader, type ConfigLoader } from "../mocks/config-loader";

describe("anchorExtractor", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;

  beforeEach(() => {
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader();
  });

  it("should extract anchor metadata from content", async () => {
    const mockResponse = {
      title: "How to Build Better Habits",
      painPoints: [
        "Struggling to maintain consistency",
        "Not knowing where to start",
        "Lack of accountability",
      ],
      solutionSteps: [
        "Start with small changes",
        "Track your progress",
        "Build accountability systems",
      ],
      proof: "Studies show that habits formed over 21 days are more likely to stick",
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await extractAnchorMetadata(
      "This is a blog post about building better habits...",
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result.title).toBe("How to Build Better Habits");
    expect(result.painPoints).toHaveLength(3);
    expect(result.painPoints[0]).toBe("Struggling to maintain consistency");
    expect(result.solutionSteps).toHaveLength(3);
    expect(result.proof).toBe("Studies show that habits formed over 21 days are more likely to stick");
  });

  it("should handle missing optional fields", async () => {
    const mockResponse = {
      title: "Test Title",
      painPoints: ["Pain 1"],
      solutionSteps: ["Step 1"],
      // No proof field
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await extractAnchorMetadata(
      "Test content",
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result.title).toBe("Test Title");
    expect(result.painPoints).toHaveLength(1);
    expect(result.solutionSteps).toHaveLength(1);
    expect(result.proof).toBeUndefined();
  });

  it("should use default title when title is missing or empty", async () => {
    const mockResponse = {
      title: "",
      painPoints: [],
      solutionSteps: [],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await extractAnchorMetadata(
      "Test content",
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result.title).toBe("Untitled Anchor Post");
  });

  it("should filter out empty pain points and solution steps", async () => {
    const mockResponse = {
      title: "Test Title",
      painPoints: ["Valid pain", "", "   ", "Another valid pain"],
      solutionSteps: ["Valid step", null, undefined, "Another valid step"],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await extractAnchorMetadata(
      "Test content",
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    expect(result.painPoints).toHaveLength(2);
    expect(result.painPoints).toEqual(["Valid pain", "Another valid pain"]);
    expect(result.solutionSteps).toHaveLength(2);
    expect(result.solutionSteps).toEqual(["Valid step", "Another valid step"]);
  });

  it("should truncate long content for analysis", async () => {
    let capturedPrompt = "";
    const mockResponse = {
      title: "Test Title",
      painPoints: [],
      solutionSteps: [],
    };

    mockLLMClient.setMockCompleteJSON(async (prompt) => {
      capturedPrompt = prompt;
      return mockResponse;
    });
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const longContent = "A".repeat(5000); // 5000 characters
    await extractAnchorMetadata(longContent, mockLLMClient as unknown as LLMClient, mockConfigLoader as unknown as ConfigLoader);

    // Should contain truncation notice
    expect(capturedPrompt).toContain("[Content truncated for analysis]");
    // Should only contain first 4000 chars of the actual content (not the full prompt)
    // The prompt includes instructions, so we check that the content portion is truncated
    const contentSection = capturedPrompt.split("Analyze this blog post/article")[1];
    if (contentSection) {
      // Extract just the content part (after the truncation notice)
      const contentMatch = contentSection.match(/\[Content truncated for analysis\]\n\n(.+?)(?:\n\nExtract|$)/s);
      if (contentMatch && contentMatch[1]) {
        expect(contentMatch[1].length).toBeLessThanOrEqual(4000);
      }
    }
  });

  it("should handle LLM errors by throwing", async () => {
    mockLLMClient.setMockCompleteJSON(async () => {
      throw new Error("LLM API error");
    });
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    await expect(
      extractAnchorMetadata("Test content", mockLLMClient as unknown as LLMClient, mockConfigLoader as unknown as ConfigLoader)
    ).rejects.toThrow("Failed to extract anchor metadata");
  });

  it("should handle invalid JSON response", async () => {
    mockLLMClient.setMockCompleteJSON(async () => {
      throw new Error("Invalid JSON");
    });
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    await expect(
      extractAnchorMetadata("Test content", mockLLMClient as unknown as LLMClient, mockConfigLoader as unknown as ConfigLoader)
    ).rejects.toThrow();
  });

  it("should handle non-array pain points and solution steps", async () => {
    const mockResponse = {
      title: "Test Title",
      painPoints: "Not an array", // Should be array
      solutionSteps: { not: "an array" }, // Should be array
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await extractAnchorMetadata(
      "Test content",
      mockLLMClient as unknown as LLMClient,
      mockConfigLoader as unknown as ConfigLoader,
    );

    // Should default to empty arrays when not arrays
    expect(result.painPoints).toEqual([]);
    expect(result.solutionSteps).toEqual([]);
  });
});

