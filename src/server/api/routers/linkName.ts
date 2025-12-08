import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
// Prisma types are available via the db instance
// Using inline types instead of Prisma namespace
import type { LinkWithConcepts } from "~/types/database";

const DEFAULT_LINK_NAMES = [
  "belongs to",
  "references",
  "is a subset of",
  "builds on",
  "contradicts",
  "related to",
  "example of",
  "prerequisite for",
  "extends",
  "similar to",
  "part of",
  "contains",
  "inspired by",
  "opposes",
];

export const linkNameRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    // Get all link names (defaults + custom, excluding deleted defaults)
    const customNames = await ctx.db.linkName.findMany({
      where: {
        isDefault: false,
        isDeleted: false,
      },
    });

    const deletedDefaults = await ctx.db.linkName.findMany({
      where: {
        isDefault: true,
        isDeleted: true,
      },
    });

    const deletedSet = new Set(deletedDefaults.map((ln: { name: string }) => ln.name));

    const availableDefaults = DEFAULT_LINK_NAMES.filter(
      (name) => !deletedSet.has(name),
    );

    const allNames = [
      ...availableDefaults,
      ...customNames.map((ln) => ln.name),
    ].sort();

    return allNames;
  }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1).trim() }))
    .mutation(async ({ ctx, input }) => {
      const trimmedName = input.name.trim();

      if (!trimmedName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Link name cannot be empty",
        });
      }

      // Check if already exists
      const existing = await ctx.db.linkName.findUnique({
        where: { name: trimmedName },
      });

      if (existing) {
        return existing;
      }

      const linkName = await ctx.db.linkName.create({
        data: {
          name: trimmedName,
          isDefault: false,
        },
      });

      return linkName;
    }),

  update: publicProcedure
    .input(
      z.object({
        oldName: z.string(),
        newName: z.string().min(1).trim(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const trimmedNewName = input.newName.trim();

      if (!trimmedNewName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "New name cannot be empty",
        });
      }

      // Update all links using the old name
      const linksToUpdate = await ctx.db.link.findMany({
        where: {
          OR: [
            { forwardName: input.oldName },
            { reverseName: input.oldName },
          ],
        },
      });

      let updatedCount = 0;

      for (const link of linksToUpdate) {
        const updateData: {
          forwardName?: string;
          reverseName?: string;
          notes?: string | null;
        } = {};

        if (link.forwardName === input.oldName) {
          updateData.forwardName = trimmedNewName;
        }

        if (link.reverseName === input.oldName) {
          updateData.reverseName = trimmedNewName;
        }

        if (Object.keys(updateData).length > 0) {
          await ctx.db.link.update({
            where: { id: link.id },
            data: updateData,
          });
          updatedCount++;
        }
      }

      // Update link name record
      const oldLinkName = await ctx.db.linkName.findUnique({
        where: { name: input.oldName },
      });

      if (oldLinkName) {
        await ctx.db.linkName.delete({
          where: { name: input.oldName },
        });
      }

      // Create new link name if it doesn't exist
      const newLinkNameExists = await ctx.db.linkName.findUnique({
        where: { name: trimmedNewName },
      });

      if (!newLinkNameExists) {
        await ctx.db.linkName.create({
          data: {
            name: trimmedNewName,
            isDefault: false,
          },
        });
      }

      return { updatedCount, success: true };
    }),

  delete: publicProcedure
    .input(
      z.object({
        name: z.string(),
        replaceWith: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isDefault = DEFAULT_LINK_NAMES.includes(input.name);

      // Check usage
      const usageCount = await ctx.db.link.count({
        where: {
          OR: [
            { forwardName: input.name },
            { reverseName: input.name },
          ],
        },
      });

      if (isDefault && usageCount > 0 && !input.replaceWith) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete default link name that is in use without replacement",
        });
      }

      if (input.replaceWith && usageCount > 0) {
        // Replace all usages
        const linksToUpdate = await ctx.db.link.findMany({
          where: {
            OR: [
              { forwardName: input.name },
              { reverseName: input.name },
            ],
          },
        });

        for (const link of linksToUpdate) {
          const updateData: {
          forwardName?: string;
          reverseName?: string;
          notes?: string | null;
        } = {};

          if (link.forwardName === input.name) {
            updateData.forwardName = input.replaceWith;
          }

          if (link.reverseName === input.name) {
            updateData.reverseName = input.replaceWith;
          }

          if (Object.keys(updateData).length > 0) {
            await ctx.db.link.update({
              where: { id: link.id },
              data: updateData,
            });
          }
        }
      }

      // Delete or mark as deleted
      if (isDefault) {
        // Mark default as deleted
        const existing = await ctx.db.linkName.findUnique({
          where: { name: input.name },
        });

        if (existing) {
          await ctx.db.linkName.update({
            where: { name: input.name },
            data: { isDeleted: true },
          });
        } else {
          await ctx.db.linkName.create({
            data: {
              name: input.name,
              isDefault: true,
              isDeleted: true,
            },
          });
        }
      } else {
        // Delete custom name
        await ctx.db.linkName.delete({
          where: { name: input.name },
        });
      }

      return { success: true, deletedCount: usageCount };
    }),

  getUsage: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      const links = await ctx.db.link.findMany({
        where: {
          OR: [
            { forwardName: input.name },
            { reverseName: input.name },
          ],
        },
        include: {
          source: true,
          target: true,
        },
      });

      const isDefault = DEFAULT_LINK_NAMES.includes(input.name);

      return {
        name: input.name,
        count: links.length,
        links: links.map((link: LinkWithConcepts) => ({
          id: link.id,
          sourceId: link.sourceId,
          targetId: link.targetId,
          sourceTitle: link.source.title,
          targetTitle: link.target.title,
        })),
        isDefault,
      };
    }),
});

