/**
 * Concept Router - tRPC procedures for concept management
 * Uses Drizzle ORM for database access
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import { eq, and, or, like, lte, desc } from "drizzle-orm";
import { concept, link } from "~/server/schema";
import { getDependencies } from "~/server/dependencies";

export const conceptRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        includeTrash: z.boolean().default(false),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (!input.includeTrash) {
        conditions.push(eq(concept.status, "active"));
      }

      if (input.search) {
        conditions.push(
          or(
            like(concept.title, `%${input.search}%`),
            like(concept.description, `%${input.search}%`),
          )!,
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const concepts = await ctx.db
        .select()
        .from(concept)
        .where(whereClause)
        .orderBy(desc(concept.createdAt));

      return concepts;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const foundConcept = await ctx.db.query.concept.findFirst({
        where: eq(concept.id, input.id),
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Concept not found",
        });
      }

      return foundConcept;
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional().default(""),
        content: z.string().min(1),
        creator: z.string().min(1),
        source: z.string().optional().default("Unknown"),
        year: z.string().optional().default(new Date().getFullYear().toString()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const identifier = `zettel-${uuidv4().slice(0, 8)}`;

      const [newConcept] = await ctx.db
        .insert(concept)
        .values({
          identifier,
          title: input.title,
          description: input.description ?? "",
          content: input.content,
          creator: input.creator,
          source: input.source ?? "Unknown",
          year: input.year ?? new Date().getFullYear().toString(),
          status: "active",
        })
        .returning();

      return newConcept;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        creator: z.string().optional(),
        source: z.string().optional(),
        year: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [updatedConcept] = await ctx.db
        .update(concept)
        .set(updateData)
        .where(eq(concept.id, id))
        .returning();

      if (!updatedConcept) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Concept not found",
        });
      }

      return updatedConcept;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedConcept] = await ctx.db
        .update(concept)
        .set({
          status: "trash",
          trashedAt: new Date(),
        })
        .where(eq(concept.id, input.id))
        .returning();

      if (!deletedConcept) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Concept not found",
        });
      }

      return deletedConcept;
    }),

  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [restoredConcept] = await ctx.db
        .update(concept)
        .set({
          status: "active",
          trashedAt: null,
        })
        .where(eq(concept.id, input.id))
        .returning();

      if (!restoredConcept) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Concept not found",
        });
      }

      return restoredConcept;
    }),

  purgeTrash: publicProcedure
    .input(z.object({ daysOld: z.number().default(30) }))
    .mutation(async ({ ctx, input }) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.daysOld);

      const result = await ctx.db
        .delete(concept)
        .where(
          and(
            eq(concept.status, "trash"),
            lte(concept.trashedAt, cutoffDate),
          )!,
        );

      return { deletedCount: result.changes };
    }),

  proposeLinks: publicProcedure
    .input(
      z.object({
        conceptId: z.string(),
        maxProposals: z.number().default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { proposeLinksForConcept } = await import(
        "~/server/services/linkProposer"
      );
      const llmClient = getLLMClient();
      const configLoader = getConfigLoader();
      return proposeLinksForConcept(
        input.conceptId,
        input.maxProposals,
        ctx.db,
        llmClient,
        configLoader,
      );
    }),

  generateCandidates: publicProcedure
    .input(
      z.object({
        text: z.string().min(1),
        instructions: z.string().optional(),
        maxCandidates: z.number().default(5),
        defaultCreator: z.string().optional(),
        defaultYear: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { generateConceptCandidates } = await import(
        "~/server/services/conceptProposer"
      );
      const { llmClient, configLoader } = getDependencies();
      return generateConceptCandidates(
        input.text,
        input.instructions,
        input.maxCandidates,
        input.defaultCreator,
        input.defaultYear,
        llmClient,
        configLoader,
      );
    }),
});
