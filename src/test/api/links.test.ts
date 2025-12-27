/**
 * Tests for Links API routes
 * GET /api/links - List links
 * POST /api/links - Create link
 * DELETE /api/links/[sourceId]/[targetId] - Delete link
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";
import { NextRequest } from "next/server";
import { cleanupTestData } from "../test-utils";
import type { ReturnType } from "~/server/db";
import { concept, link, linkName } from "~/server/schema";
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

describe("Links API", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(testDb);
  });

  describe("GET /api/links", () => {
    it("should return all links", async () => {
      const { GET } = await import("~/app/api/links/route");
      
      // Create test data in real database
      const [sourceConcept] = await testDb.insert(concept).values({
        identifier: "zettel-source",
        title: "Source Concept",
        description: "Test source",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      const [targetConcept] = await testDb.insert(concept).values({
        identifier: "zettel-target",
        title: "Target Concept",
        description: "Test target",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      // Get or create a link name
      let linkNameRecord = await testDb.query.linkName.findFirst({
        where: eq(linkName.forwardName, "relates to"),
      });
      
      if (!linkNameRecord) {
        [linkNameRecord] = await testDb.insert(linkName).values({
          forwardName: "relates to",
          reverseName: "related from",
          isSymmetric: false,
          isDefault: false,
          isDeleted: false,
        }).returning();
      }
      
      await testDb.insert(link).values({
        sourceId: sourceConcept.id,
        targetId: targetConcept.id,
        linkNameId: linkNameRecord.id,
        notes: "Test notes",
      });

      const request = new NextRequest("http://localhost/api/links");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("sourceId", sourceConcept.id);
      expect(data[0]).toHaveProperty("targetId", targetConcept.id);
    });

    it("should filter by conceptId", async () => {
      const { GET } = await import("~/app/api/links/route");
      
      // Create test concepts
      const [concept1] = await testDb.insert(concept).values({
        identifier: "zettel-1",
        title: "Concept 1",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      const [concept2] = await testDb.insert(concept).values({
        identifier: "zettel-2",
        title: "Concept 2",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      const [concept3] = await testDb.insert(concept).values({
        identifier: "zettel-3",
        title: "Concept 3",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      // Get or create link name
      let linkNameRecord = await testDb.query.linkName.findFirst({
        where: eq(linkName.forwardName, "relates to"),
      });
      
      if (!linkNameRecord) {
        [linkNameRecord] = await testDb.insert(linkName).values({
          forwardName: "relates to",
          reverseName: "related from",
          isSymmetric: false,
          isDefault: false,
          isDeleted: false,
        }).returning();
      }
      
      // Create outgoing link (concept1 -> concept2)
      await testDb.insert(link).values({
        sourceId: concept1.id,
        targetId: concept2.id,
        linkNameId: linkNameRecord.id,
      });
      
      // Create incoming link (concept3 -> concept1)
      await testDb.insert(link).values({
        sourceId: concept3.id,
        targetId: concept1.id,
        linkNameId: linkNameRecord.id,
      });

      const request = new NextRequest(`http://localhost/api/links?conceptId=${concept1.id}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("outgoing");
      expect(data).toHaveProperty("incoming");
      expect(data.outgoing).toHaveLength(1);
      expect(data.incoming).toHaveLength(1);
      expect(data.outgoing[0].targetId).toBe(concept2.id);
      expect(data.incoming[0].sourceId).toBe(concept3.id);
    });
  });

  describe("POST /api/links", () => {
    it("should create a new link", async () => {
      const { POST } = await import("~/app/api/links/route");
      
      // Create test concepts
      const [sourceConcept] = await testDb.insert(concept).values({
        identifier: "zettel-source",
        title: "Source Concept",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      const [targetConcept] = await testDb.insert(concept).values({
        identifier: "zettel-target",
        title: "Target Concept",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      // Get or create link name - use direct select to ensure it works
      let linkNameRecords = await testDb
        .select()
        .from(linkName)
        .where(eq(linkName.forwardName, "relates to"))
        .limit(1);
      
      let linkNameRecord = linkNameRecords[0];
      
      if (!linkNameRecord) {
        [linkNameRecord] = await testDb.insert(linkName).values({
          forwardName: "relates to",
          reverseName: "related from",
          isSymmetric: false,
          isDefault: false,
          isDeleted: false,
        }).returning();
      }
      
      // Verify linkName exists and can be found by ID (as the route does)
      const verifyLinkName = await testDb
        .select()
        .from(linkName)
        .where(eq(linkName.id, linkNameRecord.id))
        .limit(1);
      
      if (verifyLinkName.length === 0) {
        throw new Error(`LinkName ${linkNameRecord.id} was not found in database`);
      }
      
      // Also verify the relational query API works (as the route uses it)
      const verifyRelational = await testDb.query.linkName.findFirst({
        where: eq(linkName.id, linkNameRecord.id),
      });
      
      if (!verifyRelational) {
        // If relational query doesn't work, the route will fail
        // This might be a Drizzle relational query API issue in tests
        // For now, skip this test or use a workaround
        console.warn("Relational query API not working - this test may fail");
      }

      const request = new NextRequest("http://localhost/api/links", {
        method: "POST",
        body: JSON.stringify({
          sourceId: sourceConcept.id,
          targetId: targetConcept.id,
          linkNameId: linkNameRecord.id,
          notes: "Test notes",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      
      expect(response.status).toBe(201);
      expect(data.sourceId).toBe(sourceConcept.id);
      expect(data.targetId).toBe(targetConcept.id);
      expect(data.linkNameId).toBe(linkNameRecord.id);
      
      // Verify link was actually created in database
      const createdLink = await testDb.query.link.findFirst({
        where: eq(link.sourceId, sourceConcept.id),
      });
      expect(createdLink).toBeDefined();
      expect(createdLink?.targetId).toBe(targetConcept.id);
    });

    it("should return existing link if already exists", async () => {
      const { POST } = await import("~/app/api/links/route");
      
      // Create test concepts
      const [sourceConcept] = await testDb.insert(concept).values({
        identifier: "zettel-source",
        title: "Source Concept",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      const [targetConcept] = await testDb.insert(concept).values({
        identifier: "zettel-target",
        title: "Target Concept",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      // Get or create link name
      let linkNameRecord = await testDb.query.linkName.findFirst({
        where: eq(linkName.forwardName, "relates to"),
      });
      
      if (!linkNameRecord) {
        [linkNameRecord] = await testDb.insert(linkName).values({
          forwardName: "relates to",
          reverseName: "related from",
          isSymmetric: false,
          isDefault: false,
          isDeleted: false,
        }).returning();
      }
      
      // Create existing link
      const [existingLink] = await testDb.insert(link).values({
        sourceId: sourceConcept.id,
        targetId: targetConcept.id,
        linkNameId: linkNameRecord.id,
        notes: "Original notes",
      }).returning();

      const request = new NextRequest("http://localhost/api/links", {
        method: "POST",
        body: JSON.stringify({
          sourceId: sourceConcept.id,
          targetId: targetConcept.id,
          linkNameId: linkNameRecord.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(existingLink.id);
    });
  });

  describe("DELETE /api/links/[sourceId]/[targetId]", () => {
    it("should delete a link", async () => {
      const { DELETE } = await import("~/app/api/links/[sourceId]/[targetId]/route");
      
      // Create test concepts
      const [sourceConcept] = await testDb.insert(concept).values({
        identifier: "zettel-source",
        title: "Source Concept",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      const [targetConcept] = await testDb.insert(concept).values({
        identifier: "zettel-target",
        title: "Target Concept",
        description: "Test",
        content: "Content",
        creator: "Test",
        source: "Test",
        year: "2024",
        status: "active",
      }).returning();
      
      // Get or create link name
      let linkNameRecord = await testDb.query.linkName.findFirst({
        where: eq(linkName.forwardName, "relates to"),
      });
      
      if (!linkNameRecord) {
        [linkNameRecord] = await testDb.insert(linkName).values({
          forwardName: "relates to",
          reverseName: "related from",
          isSymmetric: false,
          isDefault: false,
          isDeleted: false,
        }).returning();
      }
      
      // Create link to delete
      await testDb.insert(link).values({
        sourceId: sourceConcept.id,
        targetId: targetConcept.id,
        linkNameId: linkNameRecord.id,
      });

      const request = new NextRequest(`http://localhost/api/links/${sourceConcept.id}/${targetConcept.id}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ sourceId: sourceConcept.id, targetId: targetConcept.id }),
      });

      expect(response.status).toBe(200);
      
      // Verify link was actually deleted
      const deletedLink = await testDb.query.link.findFirst({
        where: eq(link.sourceId, sourceConcept.id),
      });
      expect(deletedLink).toBeUndefined();
    });
  });
});
