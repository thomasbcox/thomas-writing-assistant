import { ipcMain } from "electron";
import { z } from "zod";
import { eq, and, or, like, lte, desc } from "drizzle-orm";
import { concept } from "../../src/server/schema.js";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db.js";
import { getLLMClient } from "../../src/server/services/llm/client.js";
import { getConfigLoader } from "../../src/server/services/config.js";

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
    const sqlite = (db as any).session?.client;
    // #endregion

    const conditions = [];

    if (!parsed.includeTrash) {
      conditions.push(eq(concept.status, "active"));
    }

    if (parsed.search) {
      conditions.push(
        or(
          like(concept.title, `%${parsed.search}%`),
          like(concept.description, `%${parsed.search}%`),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const concepts = await db
      .select()
      .from(concept)
      .where(whereClause)
      .orderBy(desc(concept.createdAt));

    return concepts;
  });

  // Get concept by ID
  ipcMain.handle("concept:getById", async (_event, input: unknown) => {
    const parsed = getByIdInputSchema.parse(input);
    const db = getDb();

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
      throw new Error("Concept not found");
    }

    return foundConcept;
  });

  // Create concept
  ipcMain.handle("concept:create", async (_event, input: unknown) => {
    const parsed = createInputSchema.parse(input);
    const db = getDb();

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

    return newConcept;
  });

  // Update concept
  ipcMain.handle("concept:update", async (_event, input: unknown) => {
    const parsed = updateInputSchema.parse(input);
    const db = getDb();

    const { id, ...updateData } = parsed;

    const [updatedConcept] = await db
      .update(concept)
      .set(updateData)
      .where(eq(concept.id, id))
      .returning();

    if (!updatedConcept) {
      throw new Error("Concept not found");
    }

    return updatedConcept;
  });

  // Delete concept (soft delete)
  ipcMain.handle("concept:delete", async (_event, input: unknown) => {
    const parsed = deleteInputSchema.parse(input);
    const db = getDb();

    const [deletedConcept] = await db
      .update(concept)
      .set({
        status: "trash",
        trashedAt: new Date(),
      })
      .where(eq(concept.id, parsed.id))
      .returning();

    if (!deletedConcept) {
      throw new Error("Concept not found");
    }

    return deletedConcept;
  });

  // Restore concept
  ipcMain.handle("concept:restore", async (_event, input: unknown) => {
    const parsed = restoreInputSchema.parse(input);
    const db = getDb();

    const [restoredConcept] = await db
      .update(concept)
      .set({
        status: "active",
        trashedAt: null,
      })
      .where(eq(concept.id, parsed.id))
      .returning();

    if (!restoredConcept) {
      throw new Error("Concept not found");
    }

    return restoredConcept;
  });

  // Purge trash
  ipcMain.handle("concept:purgeTrash", async (_event, input: unknown) => {
    const parsed = purgeTrashInputSchema.parse(input);
    const db = getDb();

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

    return { deletedCount: result.changes };
  });

  // Propose links
  ipcMain.handle("concept:proposeLinks", async (_event, input: unknown) => {
    const parsed = proposeLinksInputSchema.parse(input);
    const db = getDb();

    const { proposeLinksForConcept } = await import(
      "../../src/server/services/linkProposer"
    );
    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();

    return proposeLinksForConcept(
      parsed.conceptId,
      parsed.maxProposals,
      db,
      llmClient,
      configLoader,
    );
  });

  // Generate candidates
  ipcMain.handle("concept:generateCandidates", async (_event, input: unknown) => {
    const parsed = generateCandidatesInputSchema.parse(input);

    const { generateConceptCandidates } = await import(
      "../../src/server/services/conceptProposer"
    );
    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();

    return generateConceptCandidates(
      parsed.text,
      parsed.instructions,
      parsed.maxCandidates,
      parsed.defaultCreator,
      parsed.defaultYear,
      llmClient,
      configLoader,
    );
  });
}

