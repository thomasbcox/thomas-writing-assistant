/**
 * Link Name Router - tRPC procedures for link name management
 * Uses Drizzle ORM for database access
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { eq, or, and } from "drizzle-orm";
import { linkName, link } from "~/server/schema";

const DEFAULT_LINK_NAME_PAIRS: Array<{ forward: string; reverse: string }> = [
  { forward: "belongs to", reverse: "contains" },
  { forward: "references", reverse: "referenced by" },
  { forward: "is a subset of", reverse: "is a superset of" },
  { forward: "builds on", reverse: "built on by" },
  { forward: "contradicts", reverse: "contradicted by" },
  { forward: "related to", reverse: "related to" }, // symmetric
  { forward: "example of", reverse: "exemplified by" },
  { forward: "prerequisite for", reverse: "requires" },
  { forward: "extends", reverse: "extended by" },
  { forward: "similar to", reverse: "similar to" }, // symmetric
  { forward: "part of", reverse: "contains" },
  { forward: "contains", reverse: "part of" },
  { forward: "inspired by", reverse: "inspired" },
  { forward: "opposes", reverse: "opposed by" },
];

export const linkNameRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    // Get all link name pairs (defaults + custom, excluding deleted)
    const customPairs = await ctx.db
      .select()
      .from(linkName)
      .where(eq(linkName.isDefault, false));

    const deletedDefaults = await ctx.db
      .select()
      .from(linkName)
      .where(
        and(
          eq(linkName.isDefault, true),
          eq(linkName.isDeleted, true),
        )!,
      );

    const deletedSet = new Set(
      deletedDefaults.map((ln) => `${ln.forwardName}|${ln.reverseName}`),
    );

    // Get available default pairs (not deleted)
    const availableDefaults = DEFAULT_LINK_NAME_PAIRS.filter(
      (pair) => !deletedSet.has(`${pair.forward}|${pair.reverse}`),
    );

    // Get existing default pairs from database
    const existingDefaults = await ctx.db
      .select()
      .from(linkName)
      .where(
        and(
          eq(linkName.isDefault, true),
          eq(linkName.isDeleted, false),
        )!,
      );

    // Combine defaults and custom pairs
    const allPairs = [
      ...existingDefaults,
      ...customPairs,
    ];

    return allPairs;
  }),

  create: publicProcedure
    .input(
      z.object({
        forwardName: z.string().min(1).trim(),
        reverseName: z.string().min(1).trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const trimmedForward = input.forwardName.trim();
      const trimmedReverse = input.reverseName?.trim() || trimmedForward;

      if (!trimmedForward) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Forward name cannot be empty",
        });
      }

      const isSymmetric = trimmedForward === trimmedReverse;

      // Check if already exists
      const existing = await ctx.db.query.linkName.findFirst({
        where: and(
          eq(linkName.forwardName, trimmedForward),
          eq(linkName.reverseName, trimmedReverse),
        )!,
      });

      if (existing) {
        return existing;
      }

      const [newLinkName] = await ctx.db
        .insert(linkName)
        .values({
          forwardName: trimmedForward,
          reverseName: trimmedReverse,
          isSymmetric,
          isDefault: false,
          isDeleted: false,
        })
        .returning();

      return newLinkName;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        forwardName: z.string().min(1).trim(),
        reverseName: z.string().min(1).trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const trimmedForward = input.forwardName.trim();
      const trimmedReverse = input.reverseName?.trim() || trimmedForward;

      if (!trimmedForward) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Forward name cannot be empty",
        });
      }

      const isSymmetric = trimmedForward === trimmedReverse;

      // Check if LinkName exists
      const existing = await ctx.db.query.linkName.findFirst({
        where: eq(linkName.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link name not found",
        });
      }

      // Check if new pair already exists (different ID)
      const duplicate = await ctx.db.query.linkName.findFirst({
        where: and(
          eq(linkName.forwardName, trimmedForward),
          eq(linkName.reverseName, trimmedReverse),
        )!,
      });

      if (duplicate && duplicate.id !== input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A link name pair with these names already exists",
        });
      }

      // Update the LinkName record
      // This automatically updates all links using this LinkName via the foreign key relationship
      const [updated] = await ctx.db
        .update(linkName)
        .set({
          forwardName: trimmedForward,
          reverseName: trimmedReverse,
          isSymmetric,
        })
        .where(eq(linkName.id, input.id))
        .returning();

      // Count how many links use this LinkName
      const linksUsing = await ctx.db
        .select()
        .from(link)
        .where(eq(link.linkNameId, input.id));

      return { updatedLinkName: updated, linkCount: linksUsing.length, success: true };
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
        replaceWithId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the LinkName to delete
      const linkNameToDelete = await ctx.db.query.linkName.findFirst({
        where: eq(linkName.id, input.id),
      });

      if (!linkNameToDelete) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link name not found",
        });
      }

      const isDefault = linkNameToDelete.isDefault;

      // Check usage
      const linksUsingName = await ctx.db
        .select()
        .from(link)
        .where(eq(link.linkNameId, input.id));

      const usageCount = linksUsingName.length;

      if (isDefault && usageCount > 0 && !input.replaceWithId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete default link name that is in use without replacement",
        });
      }

      if (input.replaceWithId && usageCount > 0) {
        // Verify replacement LinkName exists
        const replacement = await ctx.db.query.linkName.findFirst({
          where: eq(linkName.id, input.replaceWithId),
        });

        if (!replacement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Replacement link name not found",
          });
        }

        // Replace all usages
        await ctx.db
          .update(link)
          .set({ linkNameId: input.replaceWithId })
          .where(eq(link.linkNameId, input.id));
      }

      // Delete or mark as deleted
      if (isDefault) {
        // Mark default as deleted (soft delete)
        await ctx.db
          .update(linkName)
          .set({ isDeleted: true })
          .where(eq(linkName.id, input.id));
      } else {
        // Hard delete custom name (only if not in use, or after replacement)
        if (usageCount === 0 || input.replaceWithId) {
          await ctx.db.delete(linkName).where(eq(linkName.id, input.id));
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete link name that is in use without replacement",
          });
        }
      }

      return { success: true, deletedCount: usageCount };
    }),

  getUsage: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get the LinkName
      const linkNameRecord = await ctx.db.query.linkName.findFirst({
        where: eq(linkName.id, input.id),
      });

      if (!linkNameRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link name not found",
        });
      }

      // Get all links using this LinkName
      const links = await ctx.db.query.link.findMany({
        where: eq(link.linkNameId, input.id),
        with: {
          source: true,
          target: true,
        },
      });

      return {
        linkName: linkNameRecord,
        count: links.length,
        links: links.map((linkRecord) => ({
          id: linkRecord.id,
          sourceId: linkRecord.sourceId,
          targetId: linkRecord.targetId,
          sourceTitle: linkRecord.source?.title || "",
          targetTitle: linkRecord.target?.title || "",
        })),
      };
    }),
});
