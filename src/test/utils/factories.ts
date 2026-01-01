/**
 * Test data factories for creating mock objects
 * Provides sensible defaults and allows partial overrides
 */

import { createId } from "@paralleldrive/cuid2";
import type {
  Concept,
  NewConcept,
  Link,
  NewLink,
  LinkName,
  NewLinkName,
  Offer,
  NewOffer,
  Capsule,
  NewCapsule,
  Anchor,
  NewAnchor,
  RepurposedContent,
  NewRepurposedContent,
  MRUConcept,
  NewMRUConcept,
  ChatSession,
  NewChatSession,
  ChatMessage,
  NewChatMessage,
  ConceptEmbedding,
  NewConceptEmbedding,
} from "~/server/schema";

/**
 * Create a test concept with sensible defaults
 * 
 * @param overrides - Partial overrides for specific fields
 * @returns A concept object ready for database insertion
 * 
 * @example
 * ```typescript
 * const concept = createTestConcept({ title: "Custom Title" });
 * await db.insert(schema.concept).values(concept);
 * ```
 */
export function createTestConcept(overrides?: Partial<NewConcept>): NewConcept {
  return {
    id: createId(),
    identifier: `test-concept-${createId()}`,
    title: "Test Concept",
    description: "Test description",
    content: "Test content",
    creator: "Test Creator",
    source: "Test Source",
    year: "2025",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    trashedAt: null,
    ...overrides,
  };
}

/**
 * Create a test link name with sensible defaults
 * 
 * @param overrides - Partial overrides for specific fields
 * @returns A link name object ready for database insertion
 */
export function createTestLinkName(overrides?: Partial<NewLinkName>): NewLinkName {
  return {
    id: createId(),
    forwardName: `test-forward-${createId()}`,
    reverseName: `test-reverse-${createId()}`,
    isSymmetric: false,
    isDefault: false,
    isDeleted: false,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test link with sensible defaults
 * Requires sourceId, targetId, and linkNameId to be provided
 * 
 * @param overrides - Partial overrides for specific fields (must include sourceId, targetId, linkNameId)
 * @returns A link object ready for database insertion
 */
export function createTestLink(overrides: Partial<NewLink> & { sourceId: string; targetId: string; linkNameId: string }): NewLink {
  const { sourceId, targetId, linkNameId, ...rest } = overrides;
  return {
    id: createId(),
    sourceId,
    targetId,
    linkNameId,
    notes: null,
    createdAt: new Date(),
    ...rest,
  };
}

/**
 * Create a test offer with sensible defaults
 * 
 * @param overrides - Partial overrides for specific fields
 * @returns An offer object ready for database insertion
 */
export function createTestOffer(overrides?: Partial<NewOffer>): NewOffer {
  return {
    id: createId(),
    name: "Test Offer",
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test capsule with sensible defaults
 * Uses offerId (not legacy offerMapping)
 * 
 * @param overrides - Partial overrides for specific fields
 * @returns A capsule object ready for database insertion
 */
export function createTestCapsule(overrides?: Partial<NewCapsule>): NewCapsule {
  return {
    id: createId(),
    title: "Test Capsule",
    promise: "This will help you achieve X",
    cta: "Get started now",
    offerId: null,
    offerMapping: null, // Legacy field
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test anchor with sensible defaults
 * Requires capsuleId to be provided
 * 
 * @param overrides - Partial overrides for specific fields (must include capsuleId)
 * @returns An anchor object ready for database insertion
 */
export function createTestAnchor(overrides: Partial<NewAnchor> & { capsuleId: string }): NewAnchor {
  const { capsuleId, ...rest } = overrides;
  return {
    id: createId(),
    capsuleId,
    title: "Test Anchor",
    content: "Anchor content here",
    painPoints: JSON.stringify(["Pain 1", "Pain 2"]),
    solutionSteps: JSON.stringify(["Step 1", "Step 2"]),
    proof: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
  };
}

/**
 * Create test repurposed content with sensible defaults
 * Requires anchorId to be provided
 * 
 * @param overrides - Partial overrides for specific fields (must include anchorId)
 * @returns A repurposed content object ready for database insertion
 */
export function createTestRepurposedContent(overrides: Partial<NewRepurposedContent> & { anchorId: string }): NewRepurposedContent {
  const { anchorId, ...rest } = overrides;
  return {
    id: createId(),
    anchorId,
    type: "social_post",
    content: "Social media post content",
    guidance: null,
    createdAt: new Date(),
    ...rest,
  };
}

/**
 * Create a test MRU concept with sensible defaults
 * Requires conceptId to be provided
 * 
 * @param overrides - Partial overrides for specific fields (must include conceptId)
 * @returns An MRU concept object ready for database insertion
 */
export function createTestMRUConcept(overrides: Partial<NewMRUConcept> & { conceptId: string }): NewMRUConcept {
  const { conceptId, ...rest } = overrides;
  return {
    id: createId(),
    conceptId,
    lastUsed: new Date(),
    ...rest,
  };
}

/**
 * Create a test chat session with sensible defaults
 * Requires conceptId to be provided
 * 
 * @param overrides - Partial overrides for specific fields (must include conceptId)
 * @returns A chat session object ready for database insertion
 */
export function createTestChatSession(overrides: Partial<NewChatSession> & { conceptId: string }): NewChatSession {
  const { conceptId, ...rest } = overrides;
  return {
    id: createId(),
    conceptId,
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
  };
}

/**
 * Create a test chat message with sensible defaults
 * Requires sessionId, role, and content to be provided
 * 
 * @param overrides - Partial overrides for specific fields (must include sessionId, role, content)
 * @returns A chat message object ready for database insertion
 */
export function createTestChatMessage(overrides: Partial<NewChatMessage> & { sessionId: string; role: "user" | "assistant"; content: string }): NewChatMessage {
  const { sessionId, role, content, ...rest } = overrides;
  return {
    id: createId(),
    sessionId,
    role,
    content,
    suggestions: null,
    actions: null,
    createdAt: new Date(),
    ...rest,
  };
}

/**
 * Create a test concept embedding with sensible defaults
 * Requires conceptId, embedding, and model to be provided
 * 
 * @param overrides - Partial overrides for specific fields (must include conceptId, embedding, model)
 * @returns A concept embedding object ready for database insertion
 */
export function createTestEmbedding(overrides: Partial<NewConceptEmbedding> & { conceptId: string; embedding: string; model: string }): NewConceptEmbedding {
  const { conceptId, embedding, model, ...rest } = overrides;
  return {
    id: createId(),
    conceptId,
    embedding, // JSON string of number[]
    model,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rest,
  };
}

/**
 * Helper to create a deterministic embedding vector for testing
 * Same text will always produce the same vector
 * 
 * @param text - The text to generate an embedding for
 * @param dimensions - The dimension of the embedding vector (default: 1536)
 * @returns A JSON string representation of the embedding vector
 */
export function createDeterministicEmbedding(text: string, dimensions: number = 1536): string {
  // Simple hash function to generate deterministic values
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate a vector with the specified dimensions
  const vector: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    // Use hash + i to generate deterministic but varied values
    const seed = (hash + i) % 1000;
    // Normalize to range [-1, 1] for cosine similarity
    const value = (seed / 500) - 1;
    vector.push(value);
  }
  
  return JSON.stringify(vector);
}

