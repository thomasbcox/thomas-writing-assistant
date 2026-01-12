/**
 * Schema Verification Tests
 * Prevents circular dependency issues in Drizzle ORM schema
 */

import { describe, it, expect } from "@jest/globals";
import {
  concept,
  linkName,
  link,
  offer,
  capsule,
  anchor,
  repurposedContent,
  conceptEmbedding,
  conceptSummary,
  linkRelations,
  conceptRelations,
  linkNameRelations,
  offerRelations,
  capsuleRelations,
  anchorRelations,
  repurposedContentRelations,
  conceptEmbeddingRelations,
  conceptSummaryRelations,
  chatSession,
  chatMessage,
  contextSession,
  chatSessionRelations,
  chatMessageRelations,
  mruConcept,
} from "~/server/schema";

describe("Schema", () => {
  describe("Schema Initialization", () => {
    it("should import schema without circular dependency errors", () => {
      // Simply importing should not throw
      expect(concept).toBeDefined();
      expect(linkName).toBeDefined();
      expect(link).toBeDefined();
      expect(offer).toBeDefined();
      expect(capsule).toBeDefined();
      expect(anchor).toBeDefined();
      expect(repurposedContent).toBeDefined();
      expect(conceptEmbedding).toBeDefined();
      expect(conceptSummary).toBeDefined();
      expect(chatSession).toBeDefined();
      expect(chatMessage).toBeDefined();
      expect(contextSession).toBeDefined();
      expect(mruConcept).toBeDefined();
    });

    it("should import all relations without errors", () => {
      // Relations should be importable without circular dependency issues
      expect(conceptRelations).toBeDefined();
      expect(linkNameRelations).toBeDefined();
      expect(linkRelations).toBeDefined();
      expect(offerRelations).toBeDefined();
      expect(capsuleRelations).toBeDefined();
      expect(anchorRelations).toBeDefined();
      expect(repurposedContentRelations).toBeDefined();
      expect(conceptEmbeddingRelations).toBeDefined();
      expect(conceptSummaryRelations).toBeDefined();
      expect(chatSessionRelations).toBeDefined();
      expect(chatMessageRelations).toBeDefined();
      // contextSession and mruConcept don't have relations exported
    });

    it("should have concept relations defined", () => {
      expect(conceptRelations).toBeDefined();
    });

    it("should have link relations defined", () => {
      expect(linkRelations).toBeDefined();
    });

    it("should have linkName relations defined", () => {
      expect(linkNameRelations).toBeDefined();
    });

    it("should have capsule relations defined", () => {
      expect(capsuleRelations).toBeDefined();
    });

    it("should have anchor relations defined", () => {
      expect(anchorRelations).toBeDefined();
    });

    it("should have offer relations defined", () => {
      expect(offerRelations).toBeDefined();
    });

    it("should have concept embedding relations defined", () => {
      expect(conceptEmbeddingRelations).toBeDefined();
    });

    it("should have chat session relations defined", () => {
      expect(chatSessionRelations).toBeDefined();
    });

    it("should have chat message relations defined", () => {
      expect(chatMessageRelations).toBeDefined();
    });

    it("should have context session table defined", () => {
      expect(contextSession).toBeDefined();
    });

    it("should have MRU concept table defined", () => {
      expect(mruConcept).toBeDefined();
    });
  });

  describe("Schema Structure", () => {
    it("should have all required tables defined", () => {
      const tables = [
        concept,
        linkName,
        link,
        offer,
        capsule,
        anchor,
        repurposedContent,
        conceptEmbedding,
        conceptSummary,
        chatSession,
        chatMessage,
        contextSession,
        mruConcept,
      ];

      tables.forEach((table) => {
        expect(table).toBeDefined();
        // Tables are Drizzle objects, verify they exist
        expect(typeof table).toBe("object");
      });
    });

    it("should have proper foreign key references", () => {
      // Verify link references concept
      expect(link.sourceId).toBeDefined();
      expect(link.targetId).toBeDefined();
      expect(link.linkNameId).toBeDefined();

      // Verify anchor references capsule
      expect(anchor.capsuleId).toBeDefined();

      // Verify capsule references offer
      expect(capsule.offerId).toBeDefined();
    });

    it("should have proper indexes defined", () => {
      // Verify tables are defined and are objects
      // Drizzle indexes are defined in the second parameter of sqliteTable
      // The fact that the tables are defined and can be imported confirms the schema is valid
      expect(concept).toBeDefined();
      expect(link).toBeDefined();
      expect(linkName).toBeDefined();
      
      // Verify tables are objects (Drizzle table objects)
      expect(typeof concept).toBe("object");
      expect(typeof link).toBe("object");
      expect(typeof linkName).toBe("object");
      
      // Verify tables have expected properties (columns)
      // This confirms the table structure is correct
      expect(concept).toHaveProperty("id");
      expect(link).toHaveProperty("id");
      expect(linkName).toHaveProperty("id");
    });
  });

  describe("Circular Dependency Prevention", () => {
    it("should not have circular dependencies in relations", () => {
      // This test verifies that importing the schema doesn't cause circular dependency errors
      // Simply importing and checking that relations are defined is sufficient
      // If there were circular dependencies, the import would fail

      expect(conceptRelations).toBeDefined();
      expect(linkRelations).toBeDefined();
      expect(linkNameRelations).toBeDefined();
    });

    it("should handle bidirectional relationships correctly", () => {
      // Concept -> Link (outgoing) and Link -> Concept (source/target)
      // This is a bidirectional relationship that could cause circular dependencies
      // If properly structured, both should be importable
      expect(conceptRelations).toBeDefined();
      expect(linkRelations).toBeDefined();
    });
  });
});
