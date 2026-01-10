/**
 * Drizzle ORM Schema
 * Converted from Prisma schema
 * 
 * IMPORTANT: Table definitions are ordered to avoid forward reference issues.
 * linkName must be defined before link since link references linkName.id
 */

import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// Concept table
export const concept = sqliteTable("Concept", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  identifier: text("identifier").unique().notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  content: text("content").notNull(),
  creator: text("creator").notNull(),
  source: text("source").notNull(),
  year: text("year").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdate(() => new Date()).notNull(),
  trashedAt: integer("trashedAt", { mode: "timestamp" }),
}, (table) => ({
  statusIdx: { columns: [table.status] },
  identifierIdx: { columns: [table.identifier] },
}));

// LinkName table - stores forward/reverse name pairs
// MUST be defined before Link table since Link references linkName.id
export const linkName = sqliteTable("LinkName", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  forwardName: text("forwardName").unique().notNull(), // e.g., "references"
  reverseName: text("reverseName").notNull(), // e.g., "referenced by"
  isSymmetric: integer("isSymmetric", { mode: "boolean" }).default(false).notNull(), // true if forwardName === reverseName
  isDefault: integer("isDefault", { mode: "boolean" }).default(false).notNull(),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  forwardNameIdx: { columns: [table.forwardName] },
  reverseNameIdx: { columns: [table.reverseName] },
}));

// Link table - references linkName.id (now defined above)
export const link = sqliteTable("Link", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sourceId: text("sourceId").notNull().references(() => concept.id, { onDelete: "cascade" }),
  targetId: text("targetId").notNull().references(() => concept.id, { onDelete: "cascade" }),
  linkNameId: text("linkNameId").notNull().references(() => linkName.id, { onDelete: "restrict" }),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  sourceTargetUnique: { columns: [table.sourceId, table.targetId], unique: true },
  sourceIdx: { columns: [table.sourceId] },
  targetIdx: { columns: [table.targetId] },
  linkNameIdIdx: { columns: [table.linkNameId] },
}));

// Offer table - represents a product/service offering
// Each offer can have multiple capsules (recommended 4-6)
export const offer = sqliteTable("Offer", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  nameIdx: { columns: [table.name] },
}));

// Capsule table
export const capsule = sqliteTable("Capsule", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  promise: text("promise").notNull(),
  cta: text("cta").notNull(),
  offerId: text("offerId").references(() => offer.id, { onDelete: "set null" }),
  // Legacy field - kept for migration compatibility, will be removed later
  offerMapping: text("offerMapping"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  titleIdx: { columns: [table.title] },
  offerIdIdx: { columns: [table.offerId] },
}));

// Anchor table
export const anchor = sqliteTable("Anchor", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  capsuleId: text("capsuleId").notNull().references(() => capsule.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  painPoints: text("painPoints"), // JSON array as string
  solutionSteps: text("solutionSteps"), // JSON array as string
  proof: text("proof"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  capsuleIdIdx: { columns: [table.capsuleId] },
}));

// RepurposedContent table
export const repurposedContent = sqliteTable("RepurposedContent", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  anchorId: text("anchorId").notNull().references(() => anchor.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "social_post", "email", "lead_magnet", "pinterest_pin", etc.
  content: text("content").notNull(),
  guidance: text("guidance"), // Metadata: describes the guidance/rule used to generate this content (read-only)
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  anchorIdIdx: { columns: [table.anchorId] },
  typeIdx: { columns: [table.type] },
}));

// MRUConcept table
export const mruConcept = sqliteTable("MRUConcept", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  conceptId: text("conceptId").unique().notNull(),
  lastUsed: integer("lastUsed", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  lastUsedIdx: { columns: [table.lastUsed] },
}));

// ChatSession table - stores enrichment chat sessions for concepts
export const chatSession = sqliteTable("ChatSession", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  conceptId: text("conceptId").notNull().references(() => concept.id, { onDelete: "cascade" }),
  title: text("title"), // Optional title for the session (e.g., "Enrichment - Jan 2025")
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  conceptIdIdx: { columns: [table.conceptId] },
  updatedAtIdx: { columns: [table.updatedAt] },
}));

// ChatMessage table - stores individual messages in a chat session
export const chatMessage = sqliteTable("ChatMessage", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sessionId: text("sessionId").notNull().references(() => chatSession.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  // Optional: store suggestions/actions as JSON for reconstruction
  suggestions: text("suggestions"), // JSON array of AISuggestion
  actions: text("actions"), // JSON array of QuickAction
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  sessionIdIdx: { columns: [table.sessionId] },
  createdAtIdx: { columns: [table.createdAt] },
}));

// ConceptEmbedding table - stores vector embeddings for concepts
export const conceptEmbedding = sqliteTable("ConceptEmbedding", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  conceptId: text("conceptId").unique().notNull().references(() => concept.id, { onDelete: "cascade" }),
  embedding: blob("embedding", { mode: "buffer" }).notNull(), // Binary Float32Array stored as BLOB
  model: text("model").notNull(), // e.g., "text-embedding-3-small" or "text-embedding-004"
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  conceptIdIdx: { columns: [table.conceptId], unique: true },
  modelIdx: { columns: [table.model] },
}));

// Relations - defined after all tables
// IMPORTANT: Define linkNameRelations BEFORE linkRelations so Drizzle can resolve the bidirectional relationship
export const linkNameRelations = relations(linkName, ({ many }) => ({
  links: many(link, { relationName: "LinkNameRelation" }),
}));

export const conceptRelations = relations(concept, ({ many }) => ({
  outgoingLinks: many(link, { relationName: "SourceConcept" }),
  incomingLinks: many(link, { relationName: "TargetConcept" }),
}));

export const linkRelations = relations(link, ({ one }) => ({
  source: one(concept, {
    fields: [link.sourceId],
    references: [concept.id],
    relationName: "SourceConcept",
  }),
  target: one(concept, {
    fields: [link.targetId],
    references: [concept.id],
    relationName: "TargetConcept",
  }),
  linkName: one(linkName, {
    fields: [link.linkNameId],
    references: [linkName.id],
    relationName: "LinkNameRelation",
  }),
}));

export const offerRelations = relations(offer, ({ many }) => ({
  capsules: many(capsule),
}));

export const capsuleRelations = relations(capsule, ({ one, many }) => ({
  offer: one(offer, {
    fields: [capsule.offerId],
    references: [offer.id],
  }),
  anchors: many(anchor),
}));

export const anchorRelations = relations(anchor, ({ one, many }) => ({
  capsule: one(capsule, {
    fields: [anchor.capsuleId],
    references: [capsule.id],
  }),
  repurposedContent: many(repurposedContent),
}));

export const repurposedContentRelations = relations(repurposedContent, ({ one }) => ({
  anchor: one(anchor, {
    fields: [repurposedContent.anchorId],
    references: [anchor.id],
  }),
}));

export const chatSessionRelations = relations(chatSession, ({ one, many }) => ({
  concept: one(concept, {
    fields: [chatSession.conceptId],
    references: [concept.id],
  }),
  messages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  session: one(chatSession, {
    fields: [chatMessage.sessionId],
    references: [chatSession.id],
  }),
}));

export const conceptEmbeddingRelations = relations(conceptEmbedding, ({ one }) => ({
  concept: one(concept, {
    fields: [conceptEmbedding.conceptId],
    references: [concept.id],
  }),
}));

export const conceptRelationsWithEmbedding = relations(concept, ({ one }) => ({
  embedding: one(conceptEmbedding, {
    fields: [concept.id],
    references: [conceptEmbedding.conceptId],
  }),
}));

// LLMCache table - stores semantic cache entries for LLM responses
export const llmCache = sqliteTable("LLMCache", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  queryEmbedding: blob("queryEmbedding", { mode: "buffer" }).notNull(), // Binary Float32Array stored as BLOB
  queryText: text("queryText").notNull(), // Original query text for debugging
  response: text("response").notNull(), // JSON string of the response
  provider: text("provider").notNull(), // "openai" or "gemini"
  model: text("model").notNull(), // Model name used
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  lastUsedAt: integer("lastUsedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  providerModelIdx: { columns: [table.provider, table.model] },
  lastUsedAtIdx: { columns: [table.lastUsedAt] },
}));

// ContextSession table - stores LLM context sessions for multi-turn conversations
export const contextSession = sqliteTable("ContextSession", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sessionKey: text("sessionKey").unique().notNull(), // Unique key for the session (e.g., "link-proposer:concept-123")
  provider: text("provider").notNull(), // "openai" or "gemini"
  model: text("model").notNull(), // Model name used
  contextMessages: text("contextMessages").notNull(), // JSON array of messages for context
  conceptIds: text("conceptIds"), // JSON array of concept IDs in context
  externalCacheId: text("externalCacheId"), // Gemini cache resource name (e.g., "cachedContents/abc123")
  cacheExpiresAt: integer("cacheExpiresAt", { mode: "timestamp" }), // When the cache expires
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(), // When the session expires
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  sessionKeyIdx: { columns: [table.sessionKey], unique: true },
  expiresAtIdx: { columns: [table.expiresAt] },
}));

// ConceptSummary table - stores compressed summaries of concepts for prompt optimization
export const conceptSummary = sqliteTable("ConceptSummary", {
  // @ts-expect-error - Drizzle type inference issue with sqliteTable overloads
  id: text("id").primaryKey().$defaultFn(() => createId()),
  conceptId: text("conceptId").unique().notNull().references(() => concept.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(), // Compressed summary (title + key points)
  keyPoints: text("keyPoints"), // JSON array of key points extracted
  contentHash: text("contentHash").notNull(), // Hash of original content to detect changes
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  conceptIdIdx: { columns: [table.conceptId], unique: true },
  contentHashIdx: { columns: [table.contentHash] },
}));

// Relations - defined after all tables
export const conceptSummaryRelations = relations(conceptSummary, ({ one }) => ({
  concept: one(concept, {
    fields: [conceptSummary.conceptId],
    references: [concept.id],
  }),
}));

export const conceptRelationsWithSummary = relations(concept, ({ one }) => ({
  summary: one(conceptSummary, {
    fields: [concept.id],
    references: [conceptSummary.conceptId],
  }),
}));

// Type exports for use in code
export type Concept = typeof concept.$inferSelect;
export type NewConcept = typeof concept.$inferInsert;
export type Link = typeof link.$inferSelect;
export type NewLink = typeof link.$inferInsert;
export type LinkName = typeof linkName.$inferSelect;
export type NewLinkName = typeof linkName.$inferInsert;
export type Offer = typeof offer.$inferSelect;
export type NewOffer = typeof offer.$inferInsert;
export type Capsule = typeof capsule.$inferSelect;
export type NewCapsule = typeof capsule.$inferInsert;
export type Anchor = typeof anchor.$inferSelect;
export type NewAnchor = typeof anchor.$inferInsert;
export type RepurposedContent = typeof repurposedContent.$inferSelect;
export type NewRepurposedContent = typeof repurposedContent.$inferInsert;
export type MRUConcept = typeof mruConcept.$inferSelect;
export type NewMRUConcept = typeof mruConcept.$inferInsert;
export type ChatSession = typeof chatSession.$inferSelect;
export type NewChatSession = typeof chatSession.$inferInsert;
export type ChatMessage = typeof chatMessage.$inferSelect;
export type NewChatMessage = typeof chatMessage.$inferInsert;
export type ConceptEmbedding = typeof conceptEmbedding.$inferSelect;
export type NewConceptEmbedding = typeof conceptEmbedding.$inferInsert;
export type LLMCache = typeof llmCache.$inferSelect;
export type NewLLMCache = typeof llmCache.$inferInsert;
export type ContextSession = typeof contextSession.$inferSelect;
export type NewContextSession = typeof contextSession.$inferInsert;
export type ConceptSummary = typeof conceptSummary.$inferSelect;
export type NewConceptSummary = typeof conceptSummary.$inferInsert;
