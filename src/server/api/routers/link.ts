import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const linkRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const links = await ctx.db.link.findMany({
      include: {
        source: true,
        target: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return links;
  }),

  getByConcept: publicProcedure
    .input(z.object({ conceptId: z.string() }))
    .query(async ({ ctx, input }) => {
      const outgoing = await ctx.db.link.findMany({
        where: { sourceId: input.conceptId },
        include: { 
          target: true,
          source: true,
        },
      });

      const incoming = await ctx.db.link.findMany({
        where: { targetId: input.conceptId },
        include: { 
          source: true,
          target: true,
        },
      });

      return { outgoing, incoming };
    }),

  create: publicProcedure
    .input(
      z.object({
        sourceId: z.string(),
        targetId: z.string(),
        forwardName: z.string().min(1),
        reverseName: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if link already exists
      const existing = await ctx.db.link.findUnique({
        where: {
          sourceId_targetId: {
            sourceId: input.sourceId,
            targetId: input.targetId,
          },
        },
      });

      if (existing) {
        // Update existing link
        const link = await ctx.db.link.update({
          where: { id: existing.id },
          data: {
            forwardName: input.forwardName,
            reverseName: input.reverseName ?? input.forwardName,
            notes: input.notes,
          },
        });

        return link;
      }

      // Create new link
      const link = await ctx.db.link.create({
        data: {
          sourceId: input.sourceId,
          targetId: input.targetId,
          forwardName: input.forwardName,
          reverseName: input.reverseName ?? input.forwardName,
          notes: input.notes,
        },
        include: {
          source: true,
          target: true,
        },
      });

      // Auto-add link names if they don't exist
      const linkNames = await ctx.db.linkName.findMany();
      const existingNames = new Set(linkNames.map((ln: { name: string }) => ln.name));

      if (!existingNames.has(input.forwardName)) {
        await ctx.db.linkName.create({
          data: {
            name: input.forwardName,
            isDefault: false,
          },
        });
      }

      if (input.reverseName && !existingNames.has(input.reverseName)) {
        await ctx.db.linkName.create({
          data: {
            name: input.reverseName,
            isDefault: false,
          },
        });
      }

      return link;
    }),

  delete: publicProcedure
    .input(
      z.object({
        sourceId: z.string(),
        targetId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const link = await ctx.db.link.delete({
        where: {
          sourceId_targetId: {
            sourceId: input.sourceId,
            targetId: input.targetId,
          },
        },
      });

      return link;
    }),
});

