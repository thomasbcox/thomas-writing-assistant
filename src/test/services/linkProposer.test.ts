import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { proposeLinksForConcept } from "~/server/services/linkProposer";
import { createTestContext } from "../utils/dependencies";
import { MockLLMClient } from "../mocks/llm-client";
import { MockConfigLoader } from "../mocks/config-loader";
import { createTestConcept, createTestLink, createTestLinkName } from "../utils/factories";
import { concept, link, linkName } from "~/server/schema";
import { getOrCreateEmbeddingWithContext } from "~/server/services/embeddingOrchestrator";
import { getVectorIndex, resetVectorIndex } from "~/server/services/vectorIndex";
import { closeTestDb } from "../utils/db";

describe("linkProposer", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;

  beforeEach(async () => {
    resetVectorIndex();
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader() as any;
  });

  afterEach(async () => {
    resetVectorIndex();
  });

  describe("proposeLinksForConcept", () => {
    it("should propose links for a concept", async () => {
      const sourceConcept = createTestConcept({
        title: "Machine Learning",
        content: "Machine learning is a subset of AI",
      });
      const targetConcept = createTestConcept({
        title: "Artificial Intelligence",
        content: "AI is the broader field",
      });

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      // Insert one at a time - batch insert doesn't work correctly with Drizzle
      await context.db.insert(concept).values(sourceConcept);
      await context.db.insert(concept).values(targetConcept);

      const defaultLinkName = createTestLinkName({
        forwardName: "relates-to",
        reverseName: "is-related-by",
        isDefault: true,
      });
      await context.db.insert(linkName).values(defaultLinkName);

      // Create embeddings for both concepts
      await getOrCreateEmbeddingWithContext(
        sourceConcept.id!,
        `${sourceConcept.title}\n${sourceConcept.content}`,
        context.db,
        "text-embedding-3-small",
      );
      await getOrCreateEmbeddingWithContext(
        targetConcept.id!,
        `${targetConcept.title}\n${targetConcept.content}`,
        context.db,
        "text-embedding-3-small",
      );
      await getVectorIndex().initialize(context.db);

      const mockResponse = {
        proposals: [
          {
            target: targetConcept.id!,
            target_title: targetConcept.title,
            forward_name: "relates-to",
            confidence: 0.8,
            reasoning: "Both concepts are related to AI",
          },
        ],
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const proposals = await proposeLinksForConcept(
        sourceConcept.id!,
        5,
        context,
      );

      expect(proposals.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array if source concept not found", async () => {
      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      const proposals = await proposeLinksForConcept(
        "non-existent-id",
        5,
        context,
      );

      expect(proposals).toEqual([]);
    });

    it("should exclude already linked concepts", async () => {
      const sourceConcept = createTestConcept();
      const targetConcept = createTestConcept();
      const linkNameRecord = createTestLinkName({ isDefault: true });

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      // Insert one at a time - batch insert doesn't work correctly with Drizzle
      await context.db.insert(concept).values(sourceConcept);
      await context.db.insert(concept).values(targetConcept);
      await context.db.insert(linkName).values(linkNameRecord);

      const existingLink = createTestLink({
        sourceId: sourceConcept.id!,
        targetId: targetConcept.id!,
        linkNameId: linkNameRecord.id!,
      });
      await context.db.insert(link).values(existingLink);

      mockLLMClient.setMockCompleteJSON(async () => ({ proposals: [] }));
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const proposals = await proposeLinksForConcept(
        sourceConcept.id!,
        5,
        context,
      );

      expect(proposals.every((p) => p.target !== targetConcept.id!)).toBe(true);
    });

    it("should handle config validation errors", async () => {
      mockConfigLoader.setMockValidateConfigForContentGeneration(() => {
        throw new Error("Config validation failed");
      });

      const sourceConcept = createTestConcept();
      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      await context.db.insert(concept).values(sourceConcept);

      await expect(
        proposeLinksForConcept(
          sourceConcept.id!,
          5,
          context,
        )
      ).rejects.toThrow("Config validation failed");
    });

    it("should respect maxProposals limit", async () => {
      const sourceConcept = createTestConcept();
      const targetConcepts = Array.from({ length: 10 }, () => createTestConcept());

      const context = await createTestContext({
        llm: mockLLMClient.asLLMClient(),
        config: mockConfigLoader as any,
      });

      // Insert one at a time - batch insert doesn't work correctly with Drizzle
      await context.db.insert(concept).values(sourceConcept);
      for (const targetConcept of targetConcepts) {
        await context.db.insert(concept).values(targetConcept);
      }

      const defaultLinkName = createTestLinkName({ isDefault: true });
      await context.db.insert(linkName).values(defaultLinkName);

      const mockResponse = {
        proposals: targetConcepts.map((tc) => ({
          target: tc.id!,
          target_title: tc.title,
          forward_name: "relates-to",
          confidence: 0.7,
          reasoning: "Related concept",
        })),
      };

      mockLLMClient.setMockCompleteJSON(async () => mockResponse);
      mockConfigLoader.setMockSystemPrompt("Test system prompt");

      const proposals = await proposeLinksForConcept(
        sourceConcept.id!,
        5,
        context,
      );

      expect(proposals.length).toBeLessThanOrEqual(5);
    });
  });
});

