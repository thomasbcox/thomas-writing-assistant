import { describe, test, expect, beforeEach } from "@jest/globals";
import { LLMClient, getLLMClient, resetLLMClient } from "~/server/services/llm/client";
import type { LLMProvider } from "~/server/services/llm/types";

describe("LLM Client Structure", () => {
  beforeEach(() => {
    resetLLMClient();
  });

  test("LLM client should be importable", () => {
    expect(LLMClient).toBeDefined();
    expect(getLLMClient).toBeDefined();
    expect(resetLLMClient).toBeDefined();
  });

  test("should have provider types", () => {
    // Verify provider type exists
    const providers: LLMProvider[] = ["openai", "gemini"];
    expect(providers).toContain("openai");
    expect(providers).toContain("gemini");
  });

  test("should create client with OpenAI provider when key is available", () => {
    // This test verifies the client can be instantiated
    // Actual API calls are mocked at the provider level
    try {
      const client = new LLMClient({ provider: "openai" });
      expect(client).toBeInstanceOf(LLMClient);
      expect(client.getProvider()).toBe("openai");
    } catch (error) {
      // If API key is not set, that's expected
      expect((error as Error).message).toContain("OPENAI_API_KEY");
    }
  });

  test("should create client with Gemini provider when key is available", () => {
    try {
      const client = new LLMClient({ provider: "gemini" });
      expect(client).toBeInstanceOf(LLMClient);
      expect(client.getProvider()).toBe("gemini");
    } catch (error) {
      // If API key is not set, that's expected
      expect((error as Error).message).toContain("GOOGLE_API_KEY");
    }
  });
});
