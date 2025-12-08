import type {
  Concept,
  Link,
  LinkName,
  Capsule,
  Anchor,
  RepurposedContent,
} from "@prisma/client";

export type ConceptWithLinks = Concept & {
  outgoingLinks: Array<Link & { target: Concept }>;
  incomingLinks: Array<Link & { source: Concept }>;
};

export type LinkWithConcepts = Link & {
  source: Concept;
  target: Concept;
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

// Re-export Prisma types for convenience
export type { Anchor, RepurposedContent } from "@prisma/client";

