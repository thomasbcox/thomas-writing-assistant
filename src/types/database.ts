/**
 * Database type definitions
 * 
 * This file defines two sets of types:
 * 1. Drizzle ORM types (for server-side code) - have Date objects
 * 2. Serialized types (for client-side code) - have string dates from JSON serialization
 * 
 * Components should use the Serialized types since IPC JSON-serializes Date to string.
 */

import type {
  Concept as DrizzleConcept,
  Link as DrizzleLink,
  LinkName as DrizzleLinkName,
  Capsule as DrizzleCapsule,
  Anchor as DrizzleAnchor,
  RepurposedContent as DrizzleRepurposedContent,
} from "~/server/schema";

// Re-export Drizzle types for server-side use
export type {
  Concept as DrizzleConcept,
  Link as DrizzleLink,
  LinkName as DrizzleLinkName,
  Capsule as DrizzleCapsule,
  Anchor as DrizzleAnchor,
  RepurposedContent as DrizzleRepurposedContent,
} from "~/server/schema";

// =============================================================================
// Serialized Types (for IPC wire format - dates are ISO strings)
// =============================================================================

/** Concept as received over IPC (dates are strings) */
export interface Concept {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  content: string;
  creator: string;
  source: string;
  year: string;
  status: string;
  createdAt: Date | string; // Can be Date or string depending on context
  updatedAt: Date | string;
  trashedAt: Date | string | null;
}

/** Link as received over IPC (dates are strings) */
export interface Link {
  id: string;
  sourceId: string;
  targetId: string;
  linkNameId: string;
  notes: string | null;
  createdAt: Date | string;
}

/** LinkName as received over IPC (dates are strings) */
export interface LinkName {
  id: string;
  forwardName: string;
  reverseName: string;
  isSymmetric: boolean;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: Date | string;
}

/** Capsule as received over IPC (dates are strings) */
export interface Capsule {
  id: string;
  title: string;
  promise: string;
  cta: string;
  offerMapping: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Anchor as received over IPC (dates are strings) */
export interface Anchor {
  id: string;
  capsuleId: string;
  title: string;
  content: string;
  painPoints: string | null;
  solutionSteps: string | null;
  proof: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** RepurposedContent as received over IPC (dates are strings) */
export interface RepurposedContent {
  id: string;
  anchorId: string;
  type: string;
  content: string;
  guidance?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// =============================================================================
// Composite Types
// =============================================================================

export type ConceptWithLinks = Concept & {
  outgoingLinks: Array<Link & { target: Concept }>;
  incomingLinks: Array<Link & { source: Concept }>;
};

export type LinkWithConcepts = Link & {
  source: Concept | null;
  target: Concept | null;
  linkName: LinkName | null;
};

export type CapsuleWithAnchors = Capsule & {
  anchors: Array<Anchor & { repurposedContent: RepurposedContent[] }>;
};

export type AnchorWithRepurposed = Anchor & {
  repurposedContent: RepurposedContent[];
};

export type ConceptListItem = Concept;

export type LinkListItem = LinkWithConcepts;

export type CapsuleListItem = CapsuleWithAnchors;
