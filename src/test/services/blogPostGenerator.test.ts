/**
 * Tests for blog post generator service
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { generateBlogPost } from "~/server/services/blogPostGenerator";
import type { ConceptReference } from "~/server/services/blogPostGenerator";
import type { ConfigLoader } from "~/server/services/config";

// Mock dependencies
const mockLLMClient = {
  getProvider: jest.fn(() => "openai"),
  getModel: jest.fn(() => "gpt-4o-mini"),
  getTemperature: jest.fn(() => 0.7),
  completeJSON: jest.fn<(prompt: string, systemPrompt?: string) => Promise<Record<string, unknown>>>(),
};

const mockConfigLoader = {
  getSystemPrompt: jest.fn((base: string) => `${base}\n\nSystem context`),
  getStyleGuide: jest.fn(() => ({})),
  getCredo: jest.fn(() => ({})),
  getConstraints: jest.fn(() => ({})),
  reloadConfigs: jest.fn(),
};

jest.mock("~/server/services/llm/client", () => ({
  getLLMClient: jest.fn(() => mockLLMClient),
}));

jest.mock("~/server/services/config", () => ({
  getConfigLoader: jest.fn(() => mockConfigLoader as unknown as ConfigLoader),
}));

jest.mock("~/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
  logServiceError: jest.fn(),
}));

describe("blogPostGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockConcepts: ConceptReference[] = [
    {
      id: "concept-1",
      title: "Effective Writing Habits",
      description: "Building consistent writing practices",
      content: "Writing consistently requires discipline and structure...",
      creator: "Author",
      source: "Source",
    },
    {
      id: "concept-2",
      title: "Content Strategy",
      description: "Planning and organizing content",
      content: "A good content strategy aligns with your goals...",
    },
  ];

  it("should generate a blog post with all sections", async () => {
    const mockResponse = {
      title: "How to Build Effective Writing Habits",
      introduction: "Writing consistently is key to success...",
      body: "## Section 1\n\nContent here...\n\n## Section 2\n\nMore content...",
      conclusion: "In conclusion, building writing habits takes time...",
      estimatedWordCount: 1500,
      conceptsReferenced: ["Effective Writing Habits", "Content Strategy"],
    };

    jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

    const result = await generateBlogPost(
      {
        topic: "Building writing habits",
        conceptIds: ["concept-1", "concept-2"],
        targetLength: "medium",
        tone: "conversational",
      },
      mockConcepts,
      mockLLMClient as any,
      mockConfigLoader as any,
    );

    expect(result.title).toBe(mockResponse.title);
    expect(result.introduction).toBe(mockResponse.introduction);
    expect(result.body).toBe(mockResponse.body);
    expect(result.conclusion).toBe(mockResponse.conclusion);
    expect(result.metadata?.estimatedWordCount).toBe(1500);
    expect(mockLLMClient.completeJSON).toHaveBeenCalled();
  });

  it("should include CTA when requested", async () => {
    const mockResponse = {
      title: "Test Post",
      introduction: "Intro",
      body: "Body",
      conclusion: "Conclusion",
      cta: "Sign up now!",
      estimatedWordCount: 500,
      conceptsReferenced: [],
    };

    jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

    const result = await generateBlogPost(
      {
        topic: "Test topic",
        conceptIds: ["concept-1"],
        includeCTA: true,
        ctaText: "Custom CTA",
      },
      mockConcepts,
      mockLLMClient as any,
      mockConfigLoader as any,
    );

    expect(result.cta).toBe(mockResponse.cta);
  });

  it("should handle different target lengths", async () => {
    const mockResponse = {
      title: "Short Post",
      introduction: "Intro",
      body: "Body",
      conclusion: "Conclusion",
      estimatedWordCount: 600,
      conceptsReferenced: [],
    };

    jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

    const result = await generateBlogPost(
      {
        topic: "Test",
        conceptIds: ["concept-1"],
        targetLength: "short",
      },
      mockConcepts,
      mockLLMClient as any,
      mockConfigLoader as any,
    );

    expect(result.metadata?.estimatedWordCount).toBe(600);
    const callArgs = jest.mocked(mockLLMClient.completeJSON).mock.calls[0];
    expect(callArgs[0]).toContain("approximately 500-800 words");
  });

  it("should handle different tones", async () => {
    const mockResponse = {
      title: "Authoritative Post",
      introduction: "Intro",
      body: "Body",
      conclusion: "Conclusion",
      estimatedWordCount: 2000,
      conceptsReferenced: [],
    };

    jest.mocked(mockLLMClient.completeJSON).mockResolvedValue(mockResponse);

    await generateBlogPost(
      {
        topic: "Test",
        conceptIds: ["concept-1"],
        tone: "authoritative",
      },
      mockConcepts,
      mockLLMClient as any,
      mockConfigLoader as any,
    );

    const callArgs = jest.mocked(mockLLMClient.completeJSON).mock.calls[0];
    expect(callArgs[0]).toContain("authoritative");
    expect(callArgs[0]).toContain("expert tone");
  });

  it("should handle errors gracefully", async () => {
    jest.mocked(mockLLMClient.completeJSON).mockRejectedValue(new Error("LLM error"));

    await expect(
      generateBlogPost(
        {
          topic: "Test",
          conceptIds: ["concept-1"],
        },
        mockConcepts,
        mockLLMClient as any,
        mockConfigLoader as any,
      ),
    ).rejects.toThrow("Failed to generate blog post");
  });
});
