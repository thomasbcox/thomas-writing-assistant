import { ipcMain } from "electron";
import { z } from "zod";
import { eq, and, or, like, lte, desc } from "drizzle-orm";
import { concept } from "../../src/server/schema.js";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db.js";
import { getLLMClient } from "../../src/server/services/llm/client.js";
import { getConfigLoader } from "../../src/server/services/config.js";
import { logger, logServiceError } from "../../src/lib/logger.js";
import { proposeLinksForConcept } from "../../src/server/services/linkProposer.js";
import { generateConceptCandidates } from "../../src/server/services/conceptProposer.js";
import { serializeConcept } from "../../src/lib/serializers.js";
import { generateEmbeddingForConcept } from "../../src/server/services/embeddingOrchestrator.js";
import type { DatabaseInstance } from "../../src/server/db.js";

// Input schemas
const listInputSchema = z.object({
  includeTrash: z.boolean().default(false),
  search: z.string().optional(),
});

const getByIdInputSchema = z.object({
  id: z.string(),
});

const createInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  content: z.string().min(1),
  creator: z.string().min(1),
  source: z.string().optional().default("Unknown"),
  year: z.string().optional().default(new Date().getFullYear().toString()),
});

const updateInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  creator: z.string().optional(),
  source: z.string().optional(),
  year: z.string().optional(),
});

const deleteInputSchema = z.object({
  id: z.string(),
});

const restoreInputSchema = z.object({
  id: z.string(),
});

const purgeTrashInputSchema = z.object({
  daysOld: z.number().default(30),
});

const proposeLinksInputSchema = z.object({
  conceptId: z.string(),
  maxProposals: z.number().default(5),
});

const generateCandidatesInputSchema = z.object({
  text: z.string().min(1),
  instructions: z.string().optional(),
  maxCandidates: z.number().default(5),
  defaultCreator: z.string().optional(),
  defaultYear: z.string().optional(),
});

export function registerConceptHandlers() {
  // List concepts
  ipcMain.handle("concept:list", async (_event, input: unknown) => {
    const parsed = listInputSchema.parse(input);
    const db = getDb();
    // Removed unused sqlite variable - was not being used

    logger.info({ operation: "concept:list", includeTrash: parsed.includeTrash, search: parsed.search }, "Fetching concepts");

    const conditions = [];

    if (!parsed.includeTrash) {
      conditions.push(eq(concept.status, "active"));
    }

    if (parsed.search) {
      const searchConditions = [
        like(concept.title, `%${parsed.search}%`),
        like(concept.description, `%${parsed.search}%`),
        like(concept.content, `%${parsed.search}%`),
      ].filter(Boolean);
      
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const concepts = await db
      .select()
      .from(concept)
      .where(whereClause)
      .orderBy(desc(concept.createdAt));

    logger.info({ operation: "concept:list", count: concepts.length }, "Concepts fetched successfully");
    return concepts.map(serializeConcept);
  });

  // Get concept by ID
  ipcMain.handle("concept:getById", async (_event, input: unknown) => {
    const parsed = getByIdInputSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "concept:getById", conceptId: parsed.id }, "Fetching concept by ID");

    const foundConcept = await db.query.concept.findFirst({
      where: eq(concept.id, parsed.id),
      with: {
        outgoingLinks: {
          with: {
            target: true,
            linkName: true,
          },
        },
        incomingLinks: {
          with: {
            source: true,
            linkName: true,
          },
        },
      },
    });

    if (!foundConcept) {
      logger.warn({ operation: "concept:getById", conceptId: parsed.id }, "Concept not found");
      throw new Error("Concept not found");
    }

    logger.info({ operation: "concept:getById", conceptId: parsed.id, title: foundConcept.title }, "Concept fetched successfully");
    return serializeConcept(foundConcept);
  });

  // Create concept
  ipcMain.handle("concept:create", async (_event, input: unknown) => {
    const parsed = createInputSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "concept:create", title: parsed.title, creator: parsed.creator }, "Creating concept");

    const identifier = `zettel-${uuidv4().slice(0, 8)}`;

    const [newConcept] = await db
      .insert(concept)
      .values({
        identifier,
        title: parsed.title,
        description: parsed.description ?? "",
        content: parsed.content,
        creator: parsed.creator,
        source: parsed.source ?? "Unknown",
        year: parsed.year ?? new Date().getFullYear().toString(),
        status: "active",
      })
      .returning();

    logger.info({ operation: "concept:create", conceptId: newConcept.id, title: parsed.title, identifier }, "Concept created successfully");
    
    // Generate embedding immediately to update VectorIndex - await to ensure index is updated before returning
    // This ensures the concept is immediately searchable without requiring an app restart
    try {
      await generateEmbeddingForConcept(newConcept.id, db as DatabaseInstance);
    } catch (error) {
      logger.error({ conceptId: newConcept.id, error }, "Failed to generate embedding for new concept");
      // Don't throw - concept was created successfully, embedding failure is logged but doesn't block creation
    }
    
    return serializeConcept(newConcept);
  });

  // Update concept
  ipcMain.handle("concept:update", async (_event, input: unknown) => {
    const parsed = updateInputSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "concept:update", conceptId: parsed.id, fields: Object.keys(parsed).filter(k => k !== 'id') }, "Updating concept");

    const { id, ...updateData } = parsed;

    const [updatedConcept] = await db
      .update(concept)
      .set(updateData)
      .where(eq(concept.id, id))
      .returning();

    if (!updatedConcept) {
      logger.warn({ operation: "concept:update", conceptId: id }, "Concept not found");
      throw new Error("Concept not found");
    }

    // Re-generate embedding for updated concept to keep VectorIndex fresh - await to ensure index is updated before returning
    // This ensures the updated concept is immediately searchable with its new content
    try {
      await generateEmbeddingForConcept(updatedConcept.id, db as DatabaseInstance);
    } catch (error) {
      logger.error({ conceptId: updatedConcept.id, error }, "Failed to re-generate embedding for updated concept");
      // Don't throw - concept was updated successfully, embedding failure is logged but doesn't block update
    }

    logger.info({ operation: "concept:update", conceptId: id, title: updatedConcept.title }, "Concept updated successfully");
    return serializeConcept(updatedConcept);
  });

  // Delete concept (soft delete)
  ipcMain.handle("concept:delete", async (_event, input: unknown) => {
    const parsed = deleteInputSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "concept:delete", conceptId: parsed.id }, "Soft-deleting concept");

    const [deletedConcept] = await db
      .update(concept)
      .set({
        status: "trash",
        trashedAt: new Date(),
      })
      .where(eq(concept.id, parsed.id))
      .returning();

    if (!deletedConcept) {
      logger.warn({ operation: "concept:delete", conceptId: parsed.id }, "Concept not found");
      throw new Error("Concept not found");
    }

    logger.info({ operation: "concept:delete", conceptId: parsed.id, title: deletedConcept.title }, "Concept soft-deleted successfully");
    return serializeConcept(deletedConcept);
  });

  // Restore concept
  ipcMain.handle("concept:restore", async (_event, input: unknown) => {
    const parsed = restoreInputSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "concept:restore", conceptId: parsed.id }, "Restoring concept from trash");

    const [restoredConcept] = await db
      .update(concept)
      .set({
        status: "active",
        trashedAt: null,
      })
      .where(eq(concept.id, parsed.id))
      .returning();

    if (!restoredConcept) {
      logger.warn({ operation: "concept:restore", conceptId: parsed.id }, "Concept not found");
      throw new Error("Concept not found");
    }

    logger.info({ operation: "concept:restore", conceptId: parsed.id, title: restoredConcept.title }, "Concept restored successfully");
    return serializeConcept(restoredConcept);
  });

  // Purge trash
  ipcMain.handle("concept:purgeTrash", async (_event, input: unknown) => {
    const parsed = purgeTrashInputSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "concept:purgeTrash", daysOld: parsed.daysOld }, "Purging old trashed concepts");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parsed.daysOld);

    const result = await db
      .delete(concept)
      .where(
        and(
          eq(concept.status, "trash"),
          lte(concept.trashedAt, cutoffDate),
        )!,
      );

    logger.info({ operation: "concept:purgeTrash", deletedCount: result.changes, daysOld: parsed.daysOld }, "Trash purged successfully");
    return { deletedCount: result.changes };
  });

  // Propose links
  ipcMain.handle("concept:proposeLinks", async (_event, input: unknown) => {
    const parsed = proposeLinksInputSchema.parse(input);
    const db = getDb();

    logger.info({ operation: "concept:proposeLinks", conceptId: parsed.conceptId, maxProposals: parsed.maxProposals }, "Proposing links for concept");

    try {
      const llmClient = getLLMClient();
      const configLoader = getConfigLoader();
      const context = { db: db as DatabaseInstance, llm: llmClient, config: configLoader };

      const result = await proposeLinksForConcept(
        parsed.conceptId,
        parsed.maxProposals,
        context,
      );

      logger.info({ operation: "concept:proposeLinks", conceptId: parsed.conceptId, proposalCount: result?.length ?? 0 }, "Link proposals generated successfully");
      return result;
    } catch (error) {
      logServiceError(error, "concept.proposeLinks", { conceptId: parsed.conceptId, maxProposals: parsed.maxProposals });
      throw error;
    }
  });

  // Generate candidates
  ipcMain.handle("concept:generateCandidates", async (_event, input: unknown) => {
    const parsed = generateCandidatesInputSchema.parse(input);

    logger.info({ operation: "concept:generateCandidates", textLength: parsed.text?.length ?? 0, maxCandidates: parsed.maxCandidates }, "Generating concept candidates from text");

    try {
      const db = getDb();
      const llmClient = getLLMClient();
      const configLoader = getConfigLoader();
      const context = { db: db as DatabaseInstance, llm: llmClient, config: configLoader };

      const result = await generateConceptCandidates(
        parsed.text,
        parsed.instructions,
        parsed.maxCandidates,
        context,
        parsed.defaultCreator,
        parsed.defaultYear,
      );

      logger.info({ operation: "concept:generateCandidates", candidateCount: result?.length ?? 0 }, "Concept candidates generated successfully");
      return result;
    } catch (error) {
      logServiceError(error, "concept.generateCandidates", { textLength: parsed.text?.length ?? 0, maxCandidates: parsed.maxCandidates });
      throw error;
    }
  });
}

