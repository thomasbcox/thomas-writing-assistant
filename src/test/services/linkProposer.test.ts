import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { proposeLinksForConcept } from "~/server/services/linkProposer";
import { MockLLMClient } from "../mocks/llm-client";
import { MockConfigLoader } from "../mocks/config-loader";
import { createTestDb, cleanupTestData, migrateTestDb } from "../test-utils";
import { db } from "~/server/db";
type PrismaClient = typeof db;

describe("linkProposer", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;
  let testDb: PrismaClient;

  beforeEach(async () => {
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader();
    testDb = createTestDb();
    await migrateTestDb(testDb);
    await cleanupTestData(testDb);
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
    await testDb.$disconnect();
  });

  it("should propose links successfully", async () => {
    // Create test concepts
    const sourceConcept = await testDb.concept.create({
      data: {
        identifier: "zettel-12345678",
        title: "Source Concept",
        description: "Source description",
        content: "Source content",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
      },
    });

    const targetConcept = await testDb.concept.create({
      data: {
        identifier: "zettel-87654321",
        title: "Target Concept",
        description: "Target description",
        content: "Target content",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
      },
    });

    const mockResponse = {
      proposals: [
        {
          target_id: targetConcept.id,
          forward_name: "references",
          confidence: 0.85,
          reasoning: "Target concept references source concept",
        },
      ],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await proposeLinksForConcept(
      sourceConcept.id,
      5,
      testDb,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.target).toBe(targetConcept.id);
    expect(result[0]?.forward_name).toBe("references");
    expect(result[0]?.confidence).toBe(0.85);
  });

  it("should return empty array if concept not found", async () => {
    mockLLMClient.setMockCompleteJSON(async () => ({ proposals: [] }));
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await proposeLinksForConcept(
      "non-existent-id",
      5,
      testDb,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(result).toHaveLength(0);
  });

  it("should exclude already-linked concepts", async () => {
    const sourceConcept = await testDb.concept.create({
      data: {
        identifier: "zettel-source",
        title: "Source",
        content: "Source content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      },
    });

    const target1 = await testDb.concept.create({
      data: {
        identifier: "zettel-target1",
        title: "Target 1",
        content: "Content 1",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      },
    });

    const target2 = await testDb.concept.create({
      data: {
        identifier: "zettel-target2",
        title: "Target 2",
        content: "Content 2",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      },
    });

    // Create existing link
    await testDb.link.create({
      data: {
        sourceId: sourceConcept.id,
        targetId: target1.id,
        forwardName: "references",
        reverseName: "referenced by",
      },
    });

    const mockResponse = {
      proposals: [
        {
          target_id: target2.id,
          forward_name: "related to",
          confidence: 0.75,
          reasoning: "Related concepts",
        },
      ],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await proposeLinksForConcept(
      sourceConcept.id,
      5,
      testDb,
      mockLLMClient,
      mockConfigLoader,
    );

    // Should only propose target2, not target1 (already linked)
    expect(result).toHaveLength(1);
    expect(result[0]?.target).toBe(target2.id);
  });

  it("should filter proposals by confidence threshold", async () => {
    const sourceConcept = await testDb.concept.create({
      data: {
        identifier: "zettel-source",
        title: "Source",
        content: "Source content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      },
    });

    const target = await testDb.concept.create({
      data: {
        identifier: "zettel-target",
        title: "Target",
        content: "Target content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      },
    });

    const mockResponse = {
      proposals: [
        {
          target_id: target.id,
          forward_name: "references",
          confidence: 0.3, // Below 0.5 threshold
          reasoning: "Low confidence",
        },
      ],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await proposeLinksForConcept(
      sourceConcept.id,
      5,
      testDb,
      mockLLMClient,
      mockConfigLoader,
    );

    // Should filter out low confidence proposals
    expect(result).toHaveLength(0);
  });

  it("should handle LLM errors gracefully", async () => {
    const sourceConcept = await testDb.concept.create({
      data: {
        identifier: "zettel-source",
        title: "Source",
        content: "Source content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      },
    });

    mockLLMClient.setMockCompleteJSON(async () => {
      throw new Error("LLM API error");
    });
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const result = await proposeLinksForConcept(
      sourceConcept.id,
      5,
      testDb,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(result).toHaveLength(0);
  });
});

