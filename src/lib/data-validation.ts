/**
 * Data validation utilities for checking data quality
 * Uses Drizzle ORM types
 */

import type {
  Concept,
  Link,
  Capsule,
  Anchor,
} from "~/server/schema";

export interface ValidationIssue {
  type: "missing" | "invalid" | "incomplete" | "orphaned";
  severity: "error" | "warning" | "info";
  message: string;
  field?: string;
  resourceId: string;
  resourceType: string;
}

export interface DataQualityReport {
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ValidationIssue[];
}

/**
 * Validate a concept for data quality issues
 */
export function validateConcept(concept: Concept): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for missing required fields
  if (!concept.title || concept.title.trim().length === 0) {
    issues.push({
      type: "missing",
      severity: "error",
      message: "Concept is missing a title",
      field: "title",
      resourceId: concept.id,
      resourceType: "concept",
    });
  }

  if (!concept.content || concept.content.trim().length === 0) {
    issues.push({
      type: "incomplete",
      severity: "warning",
      message: "Concept has no content",
      field: "content",
      resourceId: concept.id,
      resourceType: "concept",
    });
  }

  // Check for very short content (might be incomplete)
  if (concept.content && concept.content.trim().length < 50) {
    issues.push({
      type: "incomplete",
      severity: "info",
      message: "Concept content is very short (less than 50 characters)",
      field: "content",
      resourceId: concept.id,
      resourceType: "concept",
    });
  }

  // Check for missing metadata
  if (!concept.creator || concept.creator.trim().length === 0) {
    issues.push({
      type: "incomplete",
      severity: "info",
      message: "Concept is missing creator metadata",
      field: "creator",
      resourceId: concept.id,
      resourceType: "concept",
    });
  }

  return issues;
}

/**
 * Validate a link for data quality issues
 */
export function validateLink(
  link: Link,
  sourceExists: boolean,
  targetExists: boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for orphaned links (source or target doesn't exist)
  if (!sourceExists) {
    issues.push({
      type: "orphaned",
      severity: "error",
      message: "Link references a non-existent source concept",
      field: "sourceId",
      resourceId: link.id,
      resourceType: "link",
    });
  }

  if (!targetExists) {
    issues.push({
      type: "orphaned",
      severity: "error",
      message: "Link references a non-existent target concept",
      field: "targetId",
      resourceId: link.id,
      resourceType: "link",
    });
  }

  // Check for self-referential links
  if (link.sourceId === link.targetId) {
    issues.push({
      type: "invalid",
      severity: "warning",
      message: "Link connects a concept to itself",
      resourceId: link.id,
      resourceType: "link",
    });
  }

  return issues;
}

/**
 * Validate a capsule for data quality issues
 */
export function validateCapsule(capsule: Capsule): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!capsule.title || capsule.title.trim().length === 0) {
    issues.push({
      type: "missing",
      severity: "error",
      message: "Capsule is missing a title",
      field: "title",
      resourceId: capsule.id,
      resourceType: "capsule",
    });
  }

  if (!capsule.promise || capsule.promise.trim().length === 0) {
    issues.push({
      type: "incomplete",
      severity: "warning",
      message: "Capsule is missing a promise (value proposition)",
      field: "promise",
      resourceId: capsule.id,
      resourceType: "capsule",
    });
  }

  if (!capsule.cta || capsule.cta.trim().length === 0) {
    issues.push({
      type: "incomplete",
      severity: "warning",
      message: "Capsule is missing a CTA (call-to-action)",
      field: "cta",
      resourceId: capsule.id,
      resourceType: "capsule",
    });
  }

  return issues;
}

/**
 * Validate an anchor post for data quality issues
 */
export function validateAnchor(anchor: Anchor): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!anchor.title || anchor.title.trim().length === 0) {
    issues.push({
      type: "missing",
      severity: "error",
      message: "Anchor post is missing a title",
      field: "title",
      resourceId: anchor.id,
      resourceType: "anchor",
    });
  }

  if (!anchor.content || anchor.content.trim().length === 0) {
    issues.push({
      type: "incomplete",
      severity: "error",
      message: "Anchor post has no content",
      field: "content",
      resourceId: anchor.id,
      resourceType: "anchor",
    });
  }

  // Check for very short content
  if (anchor.content && anchor.content.trim().length < 200) {
    issues.push({
      type: "incomplete",
      severity: "warning",
      message: "Anchor post content is very short (less than 200 characters)",
      field: "content",
      resourceId: anchor.id,
      resourceType: "anchor",
    });
  }

  return issues;
}

/**
 * Generate a data quality report for all resources
 */
export function generateDataQualityReport(
  concepts: Concept[],
  links: Link[],
  capsules: Capsule[],
  anchors: Anchor[],
  conceptExists: (id: string) => boolean,
): DataQualityReport {
  const issues: ValidationIssue[] = [];

  // Validate concepts
  concepts.forEach((concept) => {
    issues.push(...validateConcept(concept));
  });

  // Validate links
  links.forEach((link) => {
    issues.push(
      ...validateLink(
        link,
        conceptExists(link.sourceId),
        conceptExists(link.targetId),
      ),
    );
  });

  // Validate capsules
  capsules.forEach((capsule) => {
    issues.push(...validateCapsule(capsule));
  });

  // Validate anchors
  anchors.forEach((anchor) => {
    issues.push(...validateAnchor(anchor));
  });

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;

  return {
    totalIssues: issues.length,
    errors,
    warnings,
    info,
    issues,
  };
}
