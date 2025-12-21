/**
 * Tests for linkProposer service
 * Uses Drizzle ORM for database access
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { proposeLinksForConcept } from "~/server/services/linkProposer";
import { MockLLMClient } from "../mocks/llm-client";
import { MockConfigLoader } from "../mocks/config-loader";
import { createTestDb, cleanupTestData, migrateTestDb } from "../test-utils";
import type { ReturnType } from "~/server/db";
import { concept, link, linkName } from "~/server/schema";
import { createId } from "@paralleldrive/cuid2";

type Database = ReturnType<typeof import("~/server/db").db>;

describe("linkProposer", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;
  let testDb: Database;

  beforeEach(async () => {
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader();
    testDb = createTestDb();
    await migrateTestDb(testDb);
    await cleanupTestData(testDb);
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
    // Close SQLite connection
    const sqlite = (testDb as any).session?.client as Database | undefined;
    if (sqlite && typeof sqlite.close === "function") {
      sqlite.close();
    }
  });

  it("should propose links successfully", async () => {
    // Create test concepts
    const [sourceConcept] = await testDb
      .insert(concept)
      .values({
        identifier: "zettel-12345678",
        title: "Source Concept",
        description: "A source concept",
        content: "This is source content",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
      })
      .returning();

    const [targetConcept1] = await testDb
      .insert(concept)
      .values({
        identifier: "zettel-87654321",
        title: "Target Concept 1",
        description: "A target concept",
        content: "This is target content 1",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
      })
      .returning();

    const [targetConcept2] = await testDb
      .insert(concept)
      .values({
        identifier: "zettel-11223344",
        title: "Target Concept 2",
        description: "Another target concept",
        content: "This is target content 2",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
      })
      .returning();

    // Mock LLM response
    const mockResponse = {
      proposals: [
        {
          target_id: targetConcept1.id,
          forward_name: "references",
          confidence: 0.9,
          reasoning: "Strong relationship",
        },
        {
          target_id: targetConcept2.id,
          forward_name: "related to",
          confidence: 0.7,
          reasoning: "Moderate relationship",
        },
      ],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    // Test link proposal
    const proposals = await proposeLinksForConcept(
      sourceConcept.id,
      5,
      testDb,
      mockLLMClient as any,
      mockConfigLoader as any,
    );

    expect(proposals).toBeDefined();
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals[0]?.source).toBe(sourceConcept.id);
    expect(proposals[0]?.target).toBe(targetConcept1.id);
    expect(proposals[0]?.forward_name).toBe("references");
  });

  it("should exclude already-linked concepts", async () => {
    // Create test concepts
    const [sourceConcept] = await testDb
      .insert(concept)
      .values({
        identifier: "zettel-source",
        title: "Source",
        description: "Source",
        content: "Content",
        creator: "Creator",
        source: "Source",
        year: "2024",
        status: "active",
      })
      .returning();

    const [linkedConcept] = await testDb
      .insert(concept)
      .values({
        identifier: "zettel-linked",
        title: "Linked",
        description: "Linked",
        content: "Content",
        creator: "Creator",
        source: "Source",
        year: "2024",
        status: "active",
      })
      .returning();

    const [unlinkedConcept] = await testDb
      .insert(concept)
      .values({
        identifier: "zettel-unlinked",
        title: "Unlinked",
        description: "Unlinked",
        content: "Content",
        creator: "Creator",
        source: "Source",
        year: "2024",
        status: "active",
      })
      .returning();

    // Create a link name pair for the existing link
    const [existingLinkName] = await testDb.insert(linkName).values({
      forwardName: "already linked",
      reverseName: "already linked to",
      isSymmetric: false,
      isDefault: false,
      isDeleted: false,
    }).returning();

    // Create existing link
    await testDb.insert(link).values({
      sourceId: sourceConcept.id,
      targetId: linkedConcept.id,
      linkNameId: existingLinkName.id,
    });

    // Mock LLM response (should only propose unlinked concept)
    const mockResponse = {
      proposals: [
        {
          target_id: unlinkedConcept.id,
          forward_name: "references",
          confidence: 0.8,
          reasoning: "Good relationship",
        },
      ],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test prompt");

    const proposals = await proposeLinksForConcept(
      sourceConcept.id,
      5,
      testDb,
      mockLLMClient as any,
      mockConfigLoader as any,
    );

    // Should not propose the already-linked concept
    const linkedProposal = proposals.find((p) => p.target === linkedConcept.id);
    expect(linkedProposal).toBeUndefined();

    // Should propose the unlinked concept
    const unlinkedProposal = proposals.find(
      (p) => p.target === unlinkedConcept.id,
    );
    expect(unlinkedProposal).toBeDefined();
  });

  it("should return empty array if concept not found", async () => {
    mockLLMClient.setMockCompleteJSON(async () => ({ proposals: [] }));
    mockConfigLoader.setMockSystemPrompt("Test prompt");

    const proposals = await proposeLinksForConcept(
      "non-existent-id",
      5,
      testDb,
      mockLLMClient as any,
      mockConfigLoader as any,
    );

    expect(proposals).toEqual([]);
  });

  it("should return empty array if no candidates available", async () => {
    // Create only one concept
    const [sourceConcept] = await testDb
      .insert(concept)
      .values({
        identifier: "zettel-only",
        title: "Only Concept",
        description: "Only",
        content: "Content",
        creator: "Creator",
        source: "Source",
        year: "2024",
        status: "active",
      })
      .returning();

    mockLLMClient.setMockCompleteJSON(async () => ({ proposals: [] }));
    mockConfigLoader.setMockSystemPrompt("Test prompt");

    const proposals = await proposeLinksForConcept(
      sourceConcept.id,
      5,
      testDb,
      mockLLMClient as any,
      mockConfigLoader as any,
    );

    expect(proposals).toEqual([]);
  });
});
