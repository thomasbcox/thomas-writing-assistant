/**
 * Tests for Admin DB Stats API route
 * GET /api/admin/db-stats - Get database statistics
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import { cleanupTestData } from "../test-utils";
import type { ReturnType } from "~/server/db";
import { concept, link, capsule } from "~/server/schema";
import { eq } from "drizzle-orm";
import { setupInMemoryDbMocks, initInMemoryDb, cleanupInMemoryDb } from "../utils/in-memory-db-setup";

// Setup mocks (must be before route imports)
setupInMemoryDbMocks();

type Database = ReturnType<typeof import("~/server/db").db>;

// Create test database - will be initialized in beforeAll
let testDb: Database;

beforeAll(async () => {
  testDb = await initInMemoryDb();
});

afterAll(() => {
  cleanupInMemoryDb();
});

describe("Admin DB Stats API", () => {
  beforeEach(async () => {
    // Clean up test data before each test - this is critical for test isolation
    await cleanupTestData(testDb);
  });

  describe("GET /api/admin/db-stats", () => {
    it("should return database statistics", async () => {
      const { GET } = await import("~/app/api/admin/db-stats/route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("counts");
      expect(data).toHaveProperty("breakdowns");
      expect(data).toHaveProperty("samples");
      expect(data.counts).toHaveProperty("Concept");
      expect(data.counts).toHaveProperty("Link");
      expect(data.counts).toHaveProperty("Capsule");
      expect(data.counts).toHaveProperty("Anchor");
      expect(data.counts).toHaveProperty("RepurposedContent");
      expect(data.counts).toHaveProperty("LinkName");
      expect(data.counts).toHaveProperty("MRUConcept");
    });

    it("should return correct counts", async () => {
      const { GET } = await import("~/app/api/admin/db-stats/route");
      
      // Create test data - ensure we start with a clean database (cleanupTestData in beforeEach)
      const [concept1] = await testDb.insert(concept).values({
        identifier: "zettel-1",
        title: "Active Concept 1",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      const [concept2] = await testDb.insert(concept).values({
        identifier: "zettel-2",
        title: "Active Concept 2",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      const [concept3] = await testDb.insert(concept).values({
        identifier: "zettel-3",
        title: "Trashed Concept",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "trash",
      }).returning();
      
      // Get a link name for the link
      const linkNameRecord = await testDb.query.linkName.findFirst();
      if (!linkNameRecord) {
        throw new Error("No link name found - cleanupTestData should create default link names");
      }
      
      await testDb.insert(link).values({
        sourceId: concept1.id,
        targetId: concept2.id,
        linkNameId: linkNameRecord.id,
      });
      
      await testDb.insert(capsule).values({
        title: "Test Capsule",
        promise: "Test promise",
        cta: "Test CTA",
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.counts.Concept).toBe(3);
      expect(data.breakdowns.concepts.total).toBe(3);
      expect(data.breakdowns.concepts.active).toBe(2);
      expect(data.breakdowns.concepts.trashed).toBe(1);
      expect(data.counts.Link).toBe(1);
      expect(data.counts.Capsule).toBe(1);
    });
  });
});
