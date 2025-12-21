/**
 * Database type definitions
 * Uses Drizzle ORM types
 */

import type {
  Concept,
  Link,
  LinkName,
  Capsule,
  Anchor,
  RepurposedContent,
} from "~/server/schema";

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

// Re-export Drizzle types for convenience
export type {
  Concept,
  Link,
  LinkName,
  Capsule,
  Anchor,
  RepurposedContent,
} from "~/server/schema";
