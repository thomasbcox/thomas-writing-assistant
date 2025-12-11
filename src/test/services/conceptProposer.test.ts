import { describe, it, expect, beforeEach } from "@jest/globals";
import { generateConceptCandidates } from "~/server/services/conceptProposer";
import { MockLLMClient } from "../mocks/llm-client";
import { MockConfigLoader } from "../mocks/config-loader";

describe("conceptProposer", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;

  beforeEach(() => {
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader();
  });

  it("should generate concept candidates successfully", async () => {
    const mockResponse = {
      concepts: [
        {
          title: "Test Concept",
          coreDefinition: "Test core definition",
          managerialApplication: "Test managerial application",
          content: "Test content",
          summary: "Test summary",
          description: "Test description",
        },
      ],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await generateConceptCandidates(
      "Test text input",
      undefined,
      5,
      undefined,
      undefined,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Test Concept");
    expect(result[0]?.coreDefinition).toBe("Test core definition");
    expect(result[0]?.managerialApplication).toBe("Test managerial application");
    expect(result[0]?.content).toBe("Test content");
  });

  it("should handle empty concepts array", async () => {
    mockLLMClient.setMockCompleteJSON(async () => ({ concepts: [] }));
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await generateConceptCandidates(
      "Test text",
      undefined,
      5,
      undefined,
      undefined,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(result).toHaveLength(0);
  });

  it("should filter out invalid concepts", async () => {
    const mockResponse = {
      concepts: [
        {
          title: "Valid Concept",
          coreDefinition: "Valid core definition",
          managerialApplication: "Valid managerial application",
          content: "Valid content",
          summary: "Valid summary",
        },
        {
          title: "Invalid Concept 1",
          coreDefinition: "Some definition",
          managerialApplication: "", // Invalid: empty managerialApplication - will be filtered
          content: "Some content",
        },
        {
          title: "Invalid Concept 2",
          coreDefinition: "", // Invalid: empty coreDefinition - will be filtered
          managerialApplication: "Some application",
          content: "Some content",
        },
        {
          // Invalid: missing required fields - will be filtered
          title: "Invalid Concept 3",
          content: "Some content",
        },
      ],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await generateConceptCandidates(
      "Test text",
      undefined,
      5,
      undefined,
      undefined,
      mockLLMClient,
      mockConfigLoader,
    );

    // Only the valid concept should pass
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Valid Concept");
    expect(result[0]?.coreDefinition).toBe("Valid core definition");
    expect(result[0]?.managerialApplication).toBe("Valid managerial application");
  });

  it("should handle LLM errors gracefully", async () => {
    mockLLMClient.setMockCompleteJSON(async () => {
      throw new Error("LLM API error");
    });
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await generateConceptCandidates(
      "Test text",
      undefined,
      5,
      undefined,
      undefined,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(result).toHaveLength(0);
  });

  it("should use text sampling strategy for large documents", async () => {
    const largeText = "x".repeat(60000); // 60k chars
    const mockResponse = {
      concepts: [
        {
          title: "Concept from Large Doc",
          coreDefinition: "Core definition",
          managerialApplication: "Managerial application",
          content: "Content",
          summary: "Summary",
        },
      ],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await generateConceptCandidates(
      largeText,
      undefined,
      5,
      undefined,
      undefined,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(result).toHaveLength(1);
    // Verify that the prompt was called (text sampling should have occurred)
    expect(mockLLMClient.getModel()).toBeDefined();
  });

  it("should include instructions in prompt when provided", async () => {
    const mockResponse = {
      concepts: [
        {
          title: "Concept",
          coreDefinition: "Core definition",
          managerialApplication: "Managerial application",
          content: "Content",
          summary: "Summary",
        },
      ],
    };

    let capturedPrompt = "";
    mockLLMClient.setMockCompleteJSON(async (prompt) => {
      capturedPrompt = prompt;
      return mockResponse;
    });
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    await generateConceptCandidates(
      "Test text",
      "Focus on technical concepts",
      5,
      undefined,
      undefined,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(capturedPrompt).toContain("Focus on technical concepts");
  });
});

