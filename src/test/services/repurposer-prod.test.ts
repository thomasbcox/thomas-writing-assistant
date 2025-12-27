/**
 * Test to reproduce derivative generation failure in PROD
 * This test simulates the PROD database scenario
 * 
 * Created: December 22, 2025
 * Last Updated: December 22, 2025
 * 
 * Tests:
 * - Anchor with JSON string pain points and solution steps (PROD scenario)
 * - Anchor with null pain points and solution steps
 * - Database connection issues when switching to PROD
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { repurposeAnchorContent } from "~/server/services/repurposer";
import { MockLLMClient } from "../mocks/llm-client";
import { MockConfigLoader } from "../mocks/config-loader";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "~/server/schema";
import { anchor, repurposedContent } from "~/server/schema";
import { eq } from "drizzle-orm";
import { safeJsonParseArray } from "~/lib/json-utils";

describe("repurposer PROD failure reproduction", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;
  let testDb: Database.Database;
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader();
    
    // Create in-memory database to simulate PROD
    testDb = new Database(":memory:");
    db = drizzle(testDb, { schema });
    
    // Initialize schema
    // Note: In real scenario, schema would be initialized via migrations
    // For test, we'll create tables manually
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS Anchor (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        capsuleId TEXT NOT NULL,
        painPoints TEXT,
        solutionSteps TEXT,
        proof TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS RepurposedContent (
        id TEXT PRIMARY KEY,
        anchorId TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        guidance TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (anchorId) REFERENCES Anchor(id) ON DELETE CASCADE
      );
    `);
  });

  it("should handle anchor with JSON string pain points and solution steps (PROD scenario)", async () => {
    // Simulate PROD database where painPoints and solutionSteps are stored as JSON strings
    const anchorId = "test-anchor-1";
    const painPointsJson = JSON.stringify(["Pain 1", "Pain 2"]);
    const solutionStepsJson = JSON.stringify(["Step 1", "Step 2"]);

    // Insert anchor with JSON strings (as they would be in PROD after migration)
    testDb.prepare(`
      INSERT INTO Anchor (id, title, content, capsuleId, painPoints, solutionSteps, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      anchorId,
      "Test Anchor",
      "Test anchor content here",
      "test-capsule-1",
      painPointsJson,
      solutionStepsJson,
      Date.now(),
      Date.now()
    );

    // Fetch anchor (simulating what the API route does)
    const foundAnchor = await db.query.anchor.findFirst({
      where: eq(anchor.id, anchorId),
    });

    expect(foundAnchor).toBeDefined();
    expect(foundAnchor?.painPoints).toBe(painPointsJson);
    expect(foundAnchor?.solutionSteps).toBe(solutionStepsJson);

    // Parse as the API route does
    const painPoints = safeJsonParseArray<string>(foundAnchor?.painPoints, []) ?? [];
    const solutionSteps = safeJsonParseArray<string>(foundAnchor?.solutionSteps, []) ?? [];

    expect(Array.isArray(painPoints)).toBe(true);
    expect(Array.isArray(solutionSteps)).toBe(true);

    // Mock LLM response
    const mockResponse = {
      social_posts: ["Post 1", "Post 2"],
      email: "Email content",
      lead_magnet: "Lead magnet",
      pinterest_pins: ["Pin 1"],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    // Test repurposing (this is what fails in PROD)
    const repurposed = await repurposeAnchorContent(
      foundAnchor!.title,
      foundAnchor!.content,
      Array.isArray(painPoints) ? painPoints : null,
      Array.isArray(solutionSteps) ? solutionSteps : null,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(repurposed.length).toBeGreaterThan(0);

    // Test saving to database (this might also fail)
    for (const item of repurposed) {
      const [saved] = await db
        .insert(repurposedContent)
        .values({
          anchorId,
          type: item.type,
          content: item.content,
          guidance: item.guidance ?? null,
        })
        .returning();
      
      expect(saved).toBeDefined();
      expect(saved?.anchorId).toBe(anchorId);
    }
  });

  it("should handle anchor with null pain points and solution steps", async () => {
    const anchorId = "test-anchor-2";

    // Insert anchor with null values
    testDb.prepare(`
      INSERT INTO Anchor (id, title, content, capsuleId, painPoints, solutionSteps, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      anchorId,
      "Test Anchor 2",
      "Test content",
      "test-capsule-1",
      null,
      null,
      Date.now(),
      Date.now()
    );

    const foundAnchor = await db.query.anchor.findFirst({
      where: eq(anchor.id, anchorId),
    });

    const painPoints = safeJsonParseArray<string>(foundAnchor?.painPoints, []) ?? [];
    const solutionSteps = safeJsonParseArray<string>(foundAnchor?.solutionSteps, []) ?? [];

    const mockResponse = {
      social_posts: ["Post 1"],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const repurposed = await repurposeAnchorContent(
      foundAnchor!.title,
      foundAnchor!.content,
      Array.isArray(painPoints) && painPoints.length > 0 ? painPoints : null,
      Array.isArray(solutionSteps) && solutionSteps.length > 0 ? solutionSteps : null,
      mockLLMClient,
      mockConfigLoader,
    );

    expect(repurposed.length).toBeGreaterThan(0);
  });

  it("should handle database connection issues when switching to PROD", async () => {
    // This test simulates the scenario where database connection might be stale
    // after switching from DEV to PROD
    
    const anchorId = "test-anchor-3";
    
    // Create anchor
    testDb.prepare(`
      INSERT INTO Anchor (id, title, content, capsuleId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      anchorId,
      "Test Anchor 3",
      "Test content",
      "test-capsule-1",
      Date.now(),
      Date.now()
    );

    // Simulate what happens when getDb() is called after database switch
    // The db instance might be using a cached connection
    const foundAnchor = await db.query.anchor.findFirst({
      where: eq(anchor.id, anchorId),
    });

    expect(foundAnchor).toBeDefined();

    // Test that repurposing works even with a fresh database connection
    const mockResponse = {
      social_posts: ["Post 1"],
      email: "Email",
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const repurposed = await repurposeAnchorContent(
      foundAnchor!.title,
      foundAnchor!.content,
      null,
      null,
      mockLLMClient,
      mockConfigLoader,
    );

    // Test that we can save to the database
    await db.delete(repurposedContent).where(eq(repurposedContent.anchorId, anchorId));

    for (const item of repurposed) {
      const [saved] = await db
        .insert(repurposedContent)
        .values({
          anchorId,
          type: item.type,
          content: item.content,
          guidance: item.guidance ?? null,
        })
        .returning();
      
      expect(saved).toBeDefined();
    }
  });
});
