/**
 * Serialization helpers for IPC communication
 * Converts Drizzle ORM Date objects to ISO strings for JSON serialization
 */

import type {
  SerializedConcept,
  SerializedLink,
  SerializedLinkName,
  SerializedAnchor,
  SerializedCapsule,
  SerializedOffer,
  SerializedChatSession,
  SerializedChatMessage,
  SerializedRepurposedContent,
} from "~/types/electron-api";
import type { concept, link, linkName, anchor, capsule, offer, chatSession, chatMessage, repurposedContent } from "~/server/schema";

/**
 * Serialize a Concept entity
 */
export function serializeConcept(c: typeof concept.$inferSelect): SerializedConcept {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    trashedAt: c.trashedAt?.toISOString() ?? null,
  };
}

/**
 * Serialize a Link entity
 */
export function serializeLink(l: typeof link.$inferSelect): SerializedLink {
  return {
    ...l,
    createdAt: l.createdAt.toISOString(),
  };
}

/**
 * Serialize a LinkName entity
 */
export function serializeLinkName(ln: typeof linkName.$inferSelect): SerializedLinkName {
  return {
    ...ln,
    createdAt: ln.createdAt.toISOString(),
  };
}

/**
 * Serialize an Anchor entity
 */
export function serializeAnchor(a: typeof anchor.$inferSelect): SerializedAnchor {
  return {
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

/**
 * Serialize a Capsule entity
 */
export function serializeCapsule(c: typeof capsule.$inferSelect): SerializedCapsule {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/**
 * Serialize an Offer entity
 */
export function serializeOffer(o: typeof offer.$inferSelect): SerializedOffer {
  return {
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

/**
 * Serialize a ChatSession entity
 */
export function serializeChatSession(cs: typeof chatSession.$inferSelect): SerializedChatSession {
  return {
    ...cs,
    createdAt: cs.createdAt.toISOString(),
    updatedAt: cs.updatedAt.toISOString(),
  };
}

/**
 * Serialize a ChatMessage entity
 */
export function serializeChatMessage(cm: typeof chatMessage.$inferSelect): SerializedChatMessage {
  return {
    ...cm,
    role: cm.role as "user" | "assistant", // Ensure type safety
    createdAt: cm.createdAt.toISOString(),
  };
}

/**
 * Serialize a RepurposedContent entity
 */
export function serializeRepurposedContent(rc: typeof repurposedContent.$inferSelect): SerializedRepurposedContent {
  return {
    ...rc,
    createdAt: rc.createdAt.toISOString(),
    updatedAt: rc.createdAt.toISOString(), // repurposedContent doesn't have updatedAt, use createdAt
  };
}

/**
 * Serialize a Link with relations (source, target, linkName)
 */
export function serializeLinkWithRelations(l: typeof link.$inferSelect & {
  source?: typeof concept.$inferSelect | null;
  target?: typeof concept.$inferSelect | null;
  linkName?: typeof linkName.$inferSelect | null;
}): import("~/types/electron-api").SerializedLinkWithRelations {
  return {
    ...serializeLink(l),
    source: l.source ? serializeConcept(l.source) : null,
    target: l.target ? serializeConcept(l.target) : null,
    linkName: l.linkName ? serializeLinkName(l.linkName) : null,
  };
}

/**
 * Serialize an Anchor with repurposed content
 */
export function serializeAnchorWithRepurposed(a: typeof anchor.$inferSelect & {
  repurposedContent?: typeof repurposedContent.$inferSelect[];
}): import("~/types/electron-api").SerializedAnchorWithRepurposed {
  return {
    ...serializeAnchor(a),
    repurposedContent: (a.repurposedContent || []).map(serializeRepurposedContent),
  };
}

/**
 * Serialize a Capsule with anchors
 */
export function serializeCapsuleWithAnchors(c: typeof capsule.$inferSelect & {
  anchors?: Array<typeof anchor.$inferSelect & {
    repurposedContent?: typeof repurposedContent.$inferSelect[];
  }>;
}): import("~/types/electron-api").SerializedCapsuleWithAnchors {
  return {
    ...serializeCapsule(c),
    anchors: (c.anchors || []).map(serializeAnchorWithRepurposed),
  };
}

/**
 * Serialize an Offer with capsules
 */
export function serializeOfferWithCapsules(o: typeof offer.$inferSelect & {
  capsules?: typeof capsule.$inferSelect[];
}): import("~/types/electron-api").SerializedOfferWithCapsules {
  return {
    ...serializeOffer(o),
    capsules: (o.capsules || []).map(serializeCapsule),
    capsuleCount: o.capsules?.length ?? 0,
  };
}

/**
 * Serialize a ChatSession with messages
 */
export function serializeChatSessionWithMessages(cs: typeof chatSession.$inferSelect & {
  messages?: typeof chatMessage.$inferSelect[];
}): import("~/types/electron-api").SerializedChatSessionWithMessages {
  return {
    ...serializeChatSession(cs),
    messages: (cs.messages || []).map(serializeChatMessage),
  };
}
