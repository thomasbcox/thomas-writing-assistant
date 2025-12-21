/**
 * Link Router - tRPC procedures for link management
 * Uses Drizzle ORM for database access
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { eq, and, desc, inArray } from "drizzle-orm";
import { link, linkName, concept } from "~/server/schema";
import { logServiceError } from "~/lib/logger";

/**
 * Helper to check if error is a Drizzle relation error
 * Only these specific errors should trigger the fallback mechanism
 */
function isDrizzleRelationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("referencedTable") ||
     error.message.includes("relation") ||
     error.message.includes("Cannot read properties of undefined"))
  );
}

export const linkRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        summary: z.boolean().optional().default(false), // If true, only return IDs, not full nested data
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const summaryOnly = input?.summary ?? false;

      if (summaryOnly) {
        // Lightweight query for dashboard - get link IDs and source/target IDs for connection checking
        // This is needed for the dashboard to calculate connection percentage
        const links = await ctx.db
          .select({ 
            id: link.id,
            sourceId: link.sourceId,
            targetId: link.targetId,
          })
          .from(link)
          .orderBy(desc(link.createdAt));

        return links;
      }

      // Full query with nested concept data and linkName for detailed views
      // Try Drizzle relational API first, fallback to batched queries if needed
      try {
        const links = await ctx.db.query.link.findMany({
          with: {
            source: true,
            target: true,
            linkName: true,
          },
          orderBy: [desc(link.createdAt)],
        });
        return links;
      } catch (error: unknown) {
        // Only catch specific Drizzle relation errors
        if (!isDrizzleRelationError(error)) {
          // Re-throw unexpected errors
          logServiceError(error, "link.getAll", {
            summary: summaryOnly,
            unexpectedError: true,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to load links: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }

        // Use fallback for expected Drizzle relation errors
        logServiceError(error, "link.getAll", {
          summary: summaryOnly,
          fallbackUsed: true,
          errorType: error instanceof Error ? error.constructor.name : "Unknown",
        });

        try {
          // Optimized batched fallback (3 queries total instead of N+1)
          const linksData = await ctx.db
            .select()
            .from(link)
            .orderBy(desc(link.createdAt));

          if (linksData.length === 0) {
            return [];
          }

          // Collect all unique IDs
          const sourceIds = [...new Set(linksData.map(l => l.sourceId))];
          const targetIds = [...new Set(linksData.map(l => l.targetId))];
          const linkNameIds = [...new Set(linksData.map(l => l.linkNameId))];

          // Batch load all relations using IN clauses (3 queries total)
          const [allSources, allTargets, allLinkNames] = await Promise.all([
            sourceIds.length > 0 ? ctx.db.select().from(concept).where(inArray(concept.id, sourceIds)) : [],
            targetIds.length > 0 ? ctx.db.select().from(concept).where(inArray(concept.id, targetIds)) : [],
            linkNameIds.length > 0 ? ctx.db.select().from(linkName).where(inArray(linkName.id, linkNameIds)) : [],
          ]);

          // Create lookup maps
          const sourceMap = new Map(allSources.map(c => [c.id, c]));
          const targetMap = new Map(allTargets.map(c => [c.id, c]));
          const linkNameMap = new Map(allLinkNames.map(ln => [ln.id, ln]));

          // Map links with relations
          return linksData.map(l => ({
            ...l,
            source: sourceMap.get(l.sourceId) || null,
            target: targetMap.get(l.targetId) || null,
            linkName: linkNameMap.get(l.linkNameId) || null,
          }));
        } catch (fallbackError: unknown) {
          // Both paths failed
          logServiceError(fallbackError, "link.getAll.fallback", {
            originalError: error instanceof Error ? error.message : "Unknown",
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to load links: both primary and fallback paths failed",
          });
        }
      }
    }),

  getByConcept: publicProcedure
    .input(z.object({ conceptId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Try Drizzle relational API first, fallback to batched queries if needed
      try {
        const outgoing = await ctx.db.query.link.findMany({
          where: eq(link.sourceId, input.conceptId),
          with: {
            source: true,
            target: true,
            linkName: true,
          },
        });

        const incoming = await ctx.db.query.link.findMany({
          where: eq(link.targetId, input.conceptId),
          with: {
            source: true,
            target: true,
            linkName: true,
          },
        });

        return { outgoing, incoming };
      } catch (error: unknown) {
        // Only catch specific Drizzle relation errors
        if (!isDrizzleRelationError(error)) {
          // Re-throw unexpected errors
          logServiceError(error, "link.getByConcept", {
            conceptId: input.conceptId,
            unexpectedError: true,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to load links: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }

        // Use fallback for expected Drizzle relation errors
        logServiceError(error, "link.getByConcept", {
          conceptId: input.conceptId,
          fallbackUsed: true,
          errorType: error instanceof Error ? error.constructor.name : "Unknown",
        });

        try {
          // Optimized batched fallback (3 queries total instead of N+1)
          const outgoingData = await ctx.db
            .select()
            .from(link)
            .where(eq(link.sourceId, input.conceptId));

          const incomingData = await ctx.db
            .select()
            .from(link)
            .where(eq(link.targetId, input.conceptId));

          const allLinks = [...outgoingData, ...incomingData];

          if (allLinks.length === 0) {
            return { outgoing: [], incoming: [] };
          }

          // Collect all unique IDs
          const sourceIds = [...new Set(allLinks.map(l => l.sourceId))];
          const targetIds = [...new Set(allLinks.map(l => l.targetId))];
          const linkNameIds = [...new Set(allLinks.map(l => l.linkNameId))];

          // Batch load all relations in 3 queries
          const [allSources, allTargets, allLinkNames] = await Promise.all([
            sourceIds.length > 0 ? ctx.db.select().from(concept).where(inArray(concept.id, sourceIds)) : [],
            targetIds.length > 0 ? ctx.db.select().from(concept).where(inArray(concept.id, targetIds)) : [],
            linkNameIds.length > 0 ? ctx.db.select().from(linkName).where(inArray(linkName.id, linkNameIds)) : [],
          ]);

          // Create lookup maps
          const sourceMap = new Map(allSources.map(c => [c.id, c]));
          const targetMap = new Map(allTargets.map(c => [c.id, c]));
          const linkNameMap = new Map(allLinkNames.map(ln => [ln.id, ln]));

          // Map links with relations
          const mapLink = (l: typeof outgoingData[0]) => ({
            ...l,
            source: sourceMap.get(l.sourceId) || null,
            target: targetMap.get(l.targetId) || null,
            linkName: linkNameMap.get(l.linkNameId) || null,
          });

          return {
            outgoing: outgoingData.map(mapLink),
            incoming: incomingData.map(mapLink),
          };
        } catch (fallbackError: unknown) {
          // Both paths failed
          logServiceError(fallbackError, "link.getByConcept.fallback", {
            conceptId: input.conceptId,
            originalError: error instanceof Error ? error.message : "Unknown",
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to load links: both primary and fallback paths failed",
          });
        }
      }
    }),

  create: publicProcedure
    .input(
      z.object({
        sourceId: z.string(),
        targetId: z.string(),
        linkNameId: z.string().min(1),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify linkNameId exists
      const linkNameRecord = await ctx.db.query.linkName.findFirst({
        where: eq(linkName.id, input.linkNameId),
      });

      if (!linkNameRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link name not found",
        });
      }

      // Check if link already exists using select query
      const existingLinks = await ctx.db
        .select()
        .from(link)
        .where(
          and(
            eq(link.sourceId, input.sourceId),
            eq(link.targetId, input.targetId),
          )!,
        );
      const existing = existingLinks[0];

      if (existing) {
        // Update existing link
        const [updatedLink] = await ctx.db
          .update(link)
          .set({
            linkNameId: input.linkNameId,
            notes: input.notes ?? null,
          })
          .where(eq(link.id, existing.id))
          .returning();

        // Try Drizzle relational API first, fallback to batched queries if needed
        try {
          const fullLink = await ctx.db.query.link.findFirst({
            where: eq(link.id, updatedLink.id),
            with: {
              source: true,
              target: true,
              linkName: true,
            },
          });

          if (!fullLink) {
            throw new Error("Failed to load updated link with relations");
          }

          return fullLink;
        } catch (error: unknown) {
          // Only catch specific Drizzle relation errors
          if (!isDrizzleRelationError(error)) {
            // Re-throw unexpected errors
            logServiceError(error, "link.create.update", {
              linkId: updatedLink.id,
              unexpectedError: true,
            });
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to load updated link: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
          }

          // Use fallback for expected Drizzle relation errors
          logServiceError(error, "link.create.update", {
            linkId: updatedLink.id,
            fallbackUsed: true,
            errorType: error instanceof Error ? error.constructor.name : "Unknown",
          });

          try {
            // Optimized batched fallback (3 queries total instead of N+1)
            const [allSources, allTargets, allLinkNames] = await Promise.all([
              ctx.db.select().from(concept).where(inArray(concept.id, [updatedLink.sourceId])),
              ctx.db.select().from(concept).where(inArray(concept.id, [updatedLink.targetId])),
              ctx.db.select().from(linkName).where(inArray(linkName.id, [updatedLink.linkNameId])),
            ]);

            return {
              ...updatedLink,
              source: allSources[0] || null,
              target: allTargets[0] || null,
              linkName: allLinkNames[0] || null,
            };
          } catch (fallbackError: unknown) {
            // Both paths failed
            logServiceError(fallbackError, "link.create.update.fallback", {
              linkId: updatedLink.id,
              originalError: error instanceof Error ? error.message : "Unknown",
            });
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to load updated link: both primary and fallback paths failed",
            });
          }
        }
      }

      // Create new link
      const [newLink] = await ctx.db
        .insert(link)
        .values({
          sourceId: input.sourceId,
          targetId: input.targetId,
          linkNameId: input.linkNameId,
          notes: input.notes ?? null,
        })
        .returning();

      // TESTING: Try Drizzle relational API
      try {
        const fullLink = await ctx.db.query.link.findFirst({
          where: eq(link.id, newLink.id),
          with: {
            source: true,
            target: true,
            linkName: true,
          },
        });
        return fullLink!;
      } catch (error: any) {
        // Fallback to manual loading
        console.error("Drizzle relation error in link.create (new):", error.message);
        const [sourceResult, targetResult, linkNameResult] = await Promise.all([
          ctx.db.select().from(concept).where(eq(concept.id, newLink.sourceId)).limit(1),
          ctx.db.select().from(concept).where(eq(concept.id, newLink.targetId)).limit(1),
          ctx.db.select().from(linkName).where(eq(linkName.id, newLink.linkNameId)).limit(1),
        ]);

        return {
          ...newLink,
          source: sourceResult[0] || null,
          target: targetResult[0] || null,
          linkName: linkNameResult[0] || null,
        };
      }
    }),

  delete: publicProcedure
    .input(
      z.object({
        sourceId: z.string(),
        targetId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get all links and filter
      const allLinksData = await ctx.db
        .select()
        .from(link);
      
      const foundLink = allLinksData.find(
        (l) => l.sourceId === input.sourceId && l.targetId === input.targetId,
      );

      if (!foundLink) {
        return null;
      }

      await ctx.db.delete(link).where(eq(link.id, foundLink.id));

      return foundLink;
    }),
});
