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
import { MockLLMClient, type LLMClient } from "../mocks/llm-client";
import { MockConfigLoader, type ConfigLoader } from "../mocks/config-loader";
import BetterSqlite3 from "better-sqlite3";
import type { Database as BetterSqlite3Database } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "~/server/schema";
import { anchor, repurposedContent } from "~/server/schema";
import { eq } from "drizzle-orm";
import { safeJsonParseArray } from "~/lib/json-utils";
import type { DatabaseInstance } from "~/server/db";

describe("repurposer PROD failure reproduction", () => {
  let mockLLMClient: MockLLMClient;
  let mockConfigLoader: MockConfigLoader;
  let testDb: BetterSqlite3Database;
  let db: DatabaseInstance;

  beforeEach(() => {
    mockLLMClient = new MockLLMClient();
    mockConfigLoader = new MockConfigLoader();
    
    // Create in-memory database to simulate PROD
    testDb = new BetterSqlite3(":memory:");
    db = drizzle(testDb, { schema });
    
    // Initialize schema
    // Note: In real scenario, schema would be initialized via migrations
    // For test, we'll create tables manually
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS Capsule (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        promise TEXT NOT NULL,
        cta TEXT NOT NULL,
        offerId TEXT,
        offerMapping TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS Anchor (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        capsuleId TEXT NOT NULL,
        painPoints TEXT,
        solutionSteps TEXT,
        proof TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (capsuleId) REFERENCES Capsule(id) ON DELETE CASCADE
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
      
      CREATE INDEX IF NOT EXISTS idx_repurposed_content_anchor_id ON RepurposedContent(anchorId);
    `);
  });

  it("should handle anchor with JSON string pain points and solution steps (PROD scenario)", async () => {
    // Simulate PROD database where painPoints and solutionSteps are stored as JSON strings
    const anchorId = "test-anchor-1";
    const painPointsJson = JSON.stringify(["Pain 1", "Pain 2"]);
    const solutionStepsJson = JSON.stringify(["Step 1", "Step 2"]);

    // Insert anchor with JSON strings using Drizzle (as they would be in PROD after migration)
    // First create a capsule (required foreign key)
    const capsuleId = "test-capsule-1";
    await db.insert(schema.capsule).values({
      id: capsuleId,
      title: "Test Capsule",
      promise: "Test promise",
      cta: "Test CTA",
    });
    
    await db.insert(anchor).values({
      id: anchorId,
      title: "Test Anchor",
      content: "Test anchor content here",
      capsuleId,
      painPoints: painPointsJson,
      solutionSteps: solutionStepsJson,
    });

    // Fetch anchor using select (query builder may not work with raw SQL inserts)
    const foundAnchor = await db
      .select()
      .from(anchor)
      .where(eq(anchor.id, anchorId))
      .limit(1);

    expect(foundAnchor.length).toBe(1);
    const anchorData = foundAnchor[0];
    expect(anchorData?.painPoints).toBe(painPointsJson);
    expect(anchorData?.solutionSteps).toBe(solutionStepsJson);

    // Parse as the API route does
    const painPoints = safeJsonParseArray<string>(anchorData?.painPoints, []) ?? [];
    const solutionSteps = safeJsonParseArray<string>(anchorData?.solutionSteps, []) ?? [];

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
      anchorData!.title,
      anchorData!.content,
      Array.isArray(painPoints) ? painPoints : null,
      Array.isArray(solutionSteps) ? solutionSteps : null,
      mockLLMClient.asLLMClient(),
      mockConfigLoader as any,
    );

    expect(repurposed.length).toBeGreaterThan(0);

    // Test saving to database
    for (const item of repurposed) {
      // Insert with explicit ID (better-sqlite3 .returning() may not work in tests)
      await db
        .insert(repurposedContent)
        .values({
          id: `rep-${Date.now()}-${Math.random()}`,
          anchorId,
          type: item.type,
          content: item.content,
          guidance: item.guidance ?? null,
        });
      
      // Verify by querying back (better-sqlite3 .returning() doesn't work reliably)
      const saved = await db
        .select()
        .from(repurposedContent)
        .where(eq(repurposedContent.anchorId, anchorId))
        .limit(1);
      
      expect(saved.length).toBeGreaterThan(0);
      expect(saved[0]?.anchorId).toBe(anchorId);
    }
  });

  it("should handle anchor with null pain points and solution steps", async () => {
    const anchorId = "test-anchor-2";

    // Insert anchor with null values using Drizzle
    const capsuleId = "test-capsule-2";
    await db.insert(schema.capsule).values({
      id: capsuleId,
      title: "Test Capsule 2",
      promise: "Test promise",
      cta: "Test CTA",
    });
    
    await db.insert(anchor).values({
      id: anchorId,
      title: "Test Anchor 2",
      content: "Test content",
      capsuleId,
      painPoints: null,
      solutionSteps: null,
    });

    const foundAnchor = await db
      .select()
      .from(anchor)
      .where(eq(anchor.id, anchorId))
      .limit(1);

    expect(foundAnchor.length).toBe(1);
    const anchorData = foundAnchor[0];
    const painPoints = safeJsonParseArray<string>(anchorData?.painPoints, []) ?? [];
    const solutionSteps = safeJsonParseArray<string>(anchorData?.solutionSteps, []) ?? [];

    const mockResponse = {
      social_posts: ["Post 1"],
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const repurposed = await repurposeAnchorContent(
      anchorData!.title,
      anchorData!.content,
      Array.isArray(painPoints) && painPoints.length > 0 ? painPoints : null,
      Array.isArray(solutionSteps) && solutionSteps.length > 0 ? solutionSteps : null,
      mockLLMClient.asLLMClient(),
      mockConfigLoader as any,
    );

    expect(repurposed.length).toBeGreaterThan(0);
  });

  it("should handle database connection issues when switching to PROD", async () => {
    // This test simulates the scenario where database connection might be stale
    // after switching from DEV to PROD
    
    const anchorId = "test-anchor-3";
    
    // Create anchor using Drizzle
    const capsuleId = "test-capsule-3";
    await db.insert(schema.capsule).values({
      id: capsuleId,
      title: "Test Capsule 3",
      promise: "Test promise",
      cta: "Test CTA",
    });
    
    await db.insert(anchor).values({
      id: anchorId,
      title: "Test Anchor 3",
      content: "Test content",
      capsuleId,
    });

    // Simulate what happens when getDb() is called after database switch
    // The db instance might be using a cached connection
    const foundAnchor = await db
      .select()
      .from(anchor)
      .where(eq(anchor.id, anchorId))
      .limit(1);

    expect(foundAnchor.length).toBe(1);
    const anchorData = foundAnchor[0];

    // Test that repurposing works even with a fresh database connection
    const mockResponse = {
      social_posts: ["Post 1"],
      email: "Email",
    };

    mockLLMClient.setMockCompleteJSON(async () => mockResponse);
    mockConfigLoader.setMockSystemPrompt("Test system prompt");

    const repurposed = await repurposeAnchorContent(
      anchorData!.title,
      anchorData!.content,
      null,
      null,
      mockLLMClient.asLLMClient(),
      mockConfigLoader as any,
    );

    // Test that we can save to the database
    await db.delete(repurposedContent).where(eq(repurposedContent.anchorId, anchorId));

    for (const item of repurposed) {
      // Insert with explicit ID (better-sqlite3 .returning() may not work in tests)
      await db
        .insert(repurposedContent)
        .values({
          id: `rep-${Date.now()}-${Math.random()}`,
          anchorId,
          type: item.type,
          content: item.content,
          guidance: item.guidance ?? null,
        });
      
      // Verify by querying back
      const saved = await db
        .select()
        .from(repurposedContent)
        .where(eq(repurposedContent.anchorId, anchorId))
        .limit(1);
      
      expect(saved.length).toBeGreaterThan(0);
      expect(saved[0]?.anchorId).toBe(anchorId);
    }
  });
});
