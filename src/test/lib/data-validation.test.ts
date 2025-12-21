/**
 * Tests for data validation utilities
 * Uses Drizzle ORM types
 */

import { describe, test, expect } from "@jest/globals";
import {
  validateConcept,
  validateLink,
  validateCapsule,
  validateAnchor,
  generateDataQualityReport,
} from "~/lib/data-validation";
import type { Concept, Link, Capsule, Anchor } from "~/server/schema";

describe("Data Validation", () => {
  describe("validateConcept", () => {
    test("should return no issues for valid concept", () => {
      const concept: Concept = {
        id: "1",
        identifier: "test-1",
        title: "Test Concept",
        description: "Test description",
        content: "This is a test concept with enough content to be valid",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        trashedAt: null,
      };

      const issues = validateConcept(concept);
      expect(issues).toHaveLength(0);
    });

    test("should detect missing title", () => {
      const concept: Concept = {
        id: "1",
        identifier: "test-1",
        title: "",
        description: "",
        content: "Some content",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        trashedAt: null,
      };

      const issues = validateConcept(concept);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.type === "missing" && i.field === "title")).toBe(true);
    });

    test("should detect missing content", () => {
      const concept: Concept = {
        id: "1",
        identifier: "test-1",
        title: "Test Concept",
        description: "",
        content: "",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        trashedAt: null,
      };

      const issues = validateConcept(concept);
      expect(issues.some((i) => i.type === "incomplete" && i.field === "content")).toBe(true);
    });

    test("should detect very short content", () => {
      const concept: Concept = {
        id: "1",
        identifier: "test-1",
        title: "Test Concept",
        description: "",
        content: "Short",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        trashedAt: null,
      };

      const issues = validateConcept(concept);
      expect(issues.some((i) => i.type === "incomplete" && i.severity === "info")).toBe(true);
    });
  });

  describe("validateLink", () => {
    test("should return no issues for valid link", () => {
      const link: Link = {
        id: "1",
        sourceId: "source-1",
        targetId: "target-1",
        linkNameId: "linkname-1",
        notes: null,
        createdAt: new Date(),
      };

      const issues = validateLink(link, true, true);
      expect(issues).toHaveLength(0);
    });

    test("should detect orphaned source", () => {
      const link: Link = {
        id: "1",
        sourceId: "source-1",
        targetId: "target-1",
        linkNameId: "linkname-1",
        notes: null,
        createdAt: new Date(),
      };

      const issues = validateLink(link, false, true);
      expect(issues.some((i) => i.type === "orphaned" && i.field === "sourceId")).toBe(true);
    });

    test("should detect orphaned target", () => {
      const link: Link = {
        id: "1",
        sourceId: "source-1",
        targetId: "target-1",
        linkNameId: "linkname-1",
        notes: null,
        createdAt: new Date(),
      };

      const issues = validateLink(link, true, false);
      expect(issues.some((i) => i.type === "orphaned" && i.field === "targetId")).toBe(true);
    });

    test("should detect self-referential link", () => {
      const link: Link = {
        id: "1",
        sourceId: "same-1",
        targetId: "same-1",
        forwardName: "references",
        reverseName: "referenced by",
        notes: null,
        createdAt: new Date(),
      };

      const issues = validateLink(link, true, true);
      expect(issues.some((i) => i.type === "invalid")).toBe(true);
    });
  });

  describe("validateCapsule", () => {
    test("should return no issues for valid capsule", () => {
      const capsule: Capsule = {
        id: "1",
        title: "Test Capsule",
        promise: "Test promise",
        cta: "Test CTA",
        offerMapping: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const issues = validateCapsule(capsule);
      expect(issues).toHaveLength(0);
    });

    test("should detect missing title", () => {
      const capsule: Capsule = {
        id: "1",
        title: "",
        promise: "Test promise",
        cta: "Test CTA",
        offerMapping: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const issues = validateCapsule(capsule);
      expect(issues.some((i) => i.type === "missing" && i.field === "title")).toBe(true);
    });

    test("should detect missing promise", () => {
      const capsule: Capsule = {
        id: "1",
        title: "Test Capsule",
        promise: "",
        cta: "Test CTA",
        offerMapping: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const issues = validateCapsule(capsule);
      expect(issues.some((i) => i.type === "incomplete" && i.field === "promise")).toBe(true);
    });
  });

  describe("validateAnchor", () => {
    test("should return no issues for valid anchor", () => {
      const anchor: Anchor = {
        id: "1",
        capsuleId: "capsule-1",
        title: "Test Anchor",
        content:
          "This is a test anchor with enough content to be valid. It has more than 200 characters to pass the validation check. This content is long enough to satisfy the minimum length requirement for anchor posts. It provides sufficient detail and context for the anchor post to be considered complete and ready for use.",
        painPoints: null,
        solutionSteps: null,
        proof: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const issues = validateAnchor(anchor);
      expect(issues).toHaveLength(0);
    });

    test("should detect missing title", () => {
      const anchor: Anchor = {
        id: "1",
        capsuleId: "capsule-1",
        title: "",
        content: "Some content",
        painPoints: null,
        solutionSteps: null,
        proof: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const issues = validateAnchor(anchor);
      expect(issues.some((i) => i.type === "missing" && i.field === "title")).toBe(true);
    });

    test("should detect missing content", () => {
      const anchor: Anchor = {
        id: "1",
        capsuleId: "capsule-1",
        title: "Test Anchor",
        content: "",
        painPoints: null,
        solutionSteps: null,
        proof: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const issues = validateAnchor(anchor);
      expect(issues.some((i) => i.type === "incomplete" && i.field === "content")).toBe(true);
    });
  });

  describe("generateDataQualityReport", () => {
    test("should generate report with no issues for valid data", () => {
      const concepts: Concept[] = [
        {
          id: "1",
          identifier: "test-1",
          title: "Test Concept",
          description: "",
          content: "Valid content with enough text",
          creator: "Test Creator",
          source: "Test Source",
          year: "2024",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          trashedAt: null,
        },
      ];

      const links: Link[] = [];
      const capsules: Capsule[] = [];
      const anchors: Anchor[] = [];

      const report = generateDataQualityReport(
        concepts,
        links,
        capsules,
        anchors,
        (id) => concepts.some((c) => c.id === id),
      );

      // May have info-level issues (like missing creator), but no errors or warnings
      expect(report.errors).toBe(0);
      expect(report.warnings).toBe(0);
    });

    test("should detect issues in data", () => {
      const concepts: Concept[] = [
        {
          id: "1",
          identifier: "test-1",
          title: "", // Missing title
          description: "",
          content: "", // Missing content
          creator: "",
          source: "Test Source",
          year: "2024",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          trashedAt: null,
        },
      ];

      const links: Link[] = [];
      const capsules: Capsule[] = [];
      const anchors: Anchor[] = [];

      const report = generateDataQualityReport(
        concepts,
        links,
        capsules,
        anchors,
        (id) => concepts.some((c) => c.id === id),
      );

      expect(report.totalIssues).toBeGreaterThan(0);
      expect(report.errors).toBeGreaterThan(0);
    });
  });
});
