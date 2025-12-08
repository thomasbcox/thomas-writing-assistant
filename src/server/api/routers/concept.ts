import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
// Prisma types are available via the db instance
// Using inline types instead of Prisma namespace
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";

export const conceptRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        includeTrash: z.boolean().default(false),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        status?: string;
        OR?: Array<{ title?: { contains: string } } | { description?: { contains: string } }>;
      } = {};
      
      if (!input.includeTrash) {
        where.status = "active";
      }
      
      if (input.search) {
        where.OR = [
          { title: { contains: input.search } },
          { description: { contains: input.search } },
        ];
      }

      const concepts = await ctx.db.concept.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return concepts;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const concept = await ctx.db.concept.findUnique({
        where: { id: input.id },
        include: {
          outgoingLinks: {
            include: { target: true },
          },
          incomingLinks: {
            include: { source: true },
          },
        },
      });

      if (!concept) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Concept not found",
        });
      }

      return concept;
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

      const concept = await ctx.db.concept.create({
        data: {
          identifier,
          title: input.title,
          description: input.description ?? "",
          content: input.content,
          creator: input.creator,
          source: input.source ?? "Unknown",
          year: input.year ?? new Date().getFullYear().toString(),
          status: "active",
        },
      });

      return concept;
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
      const { id, ...data } = input;

      const concept = await ctx.db.concept.update({
        where: { id },
        data,
      });

      return concept;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const concept = await ctx.db.concept.update({
        where: { id: input.id },
        data: {
          status: "trash",
          trashedAt: new Date(),
        },
      });

      return concept;
    }),

  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const concept = await ctx.db.concept.update({
        where: { id: input.id },
        data: {
          status: "active",
          trashedAt: null,
        },
      });

      return concept;
    }),

  purgeTrash: publicProcedure
    .input(z.object({ daysOld: z.number().default(30) }))
    .mutation(async ({ ctx, input }) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.daysOld);

      const result = await ctx.db.concept.deleteMany({
        where: {
          status: "trash",
          trashedAt: {
            lte: cutoffDate,
          },
        },
      });

      return { deletedCount: result.count };
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
      const llmClient = getLLMClient();
      const configLoader = getConfigLoader();
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

