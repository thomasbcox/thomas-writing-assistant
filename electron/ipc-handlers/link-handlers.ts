import { ipcMain } from "electron";
import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { link, linkName, concept } from "../../src/server/schema.js";
import { getDb } from "../db.js";
import { logServiceError } from "../../src/lib/logger.js";

// Helper to check if error is a Drizzle relation error
function isDrizzleRelationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("referencedTable") ||
     error.message.includes("relation") ||
     error.message.includes("Cannot read properties of undefined"))
  );
}

export function registerLinkHandlers() {
  // Get all links
  ipcMain.handle("link:getAll", async (_event, input: unknown) => {
    const parsed = z.object({
      summary: z.boolean().optional().default(false),
    }).optional().parse(input);
    
    const db = getDb();
    const summaryOnly = parsed?.summary ?? false;

    if (summaryOnly) {
      const links = await db
        .select({ 
          id: link.id,
          sourceId: link.sourceId,
          targetId: link.targetId,
        })
        .from(link)
        .orderBy(desc(link.createdAt));
      return links;
    }

    try {
      const links = await db.query.link.findMany({
        with: {
          source: true,
          target: true,
          linkName: true,
        },
        orderBy: [desc(link.createdAt)],
      });
      return links;
    } catch (error: unknown) {
      if (!isDrizzleRelationError(error)) {
        logServiceError(error, "link.getAll", { summary: summaryOnly });
        throw new Error(`Failed to load links: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      // Fallback to batched queries
      const linksData = await db
        .select()
        .from(link)
        .orderBy(desc(link.createdAt));

      if (linksData.length === 0) {
        return [];
      }

      const sourceIds = [...new Set(linksData.map(l => l.sourceId))];
      const targetIds = [...new Set(linksData.map(l => l.targetId))];
      const linkNameIds = [...new Set(linksData.map(l => l.linkNameId))];

      const [allSources, allTargets, allLinkNames] = await Promise.all([
        sourceIds.length > 0 ? db.select().from(concept).where(inArray(concept.id, sourceIds)) : [],
        targetIds.length > 0 ? db.select().from(concept).where(inArray(concept.id, targetIds)) : [],
        linkNameIds.length > 0 ? db.select().from(linkName).where(inArray(linkName.id, linkNameIds)) : [],
      ]);

      const sourceMap = new Map(allSources.map(c => [c.id, c]));
      const targetMap = new Map(allTargets.map(c => [c.id, c]));
      const linkNameMap = new Map(allLinkNames.map(ln => [ln.id, ln]));

      return linksData.map(l => ({
        ...l,
        source: sourceMap.get(l.sourceId) || null,
        target: targetMap.get(l.targetId) || null,
        linkName: linkNameMap.get(l.linkNameId) || null,
      }));
    }
  });

  // Get links by concept
  ipcMain.handle("link:getByConcept", async (_event, input: unknown) => {
    const parsed = z.object({ conceptId: z.string() }).parse(input);
    const db = getDb();

    try {
      const outgoing = await db.query.link.findMany({
        where: eq(link.sourceId, parsed.conceptId),
        with: {
          source: true,
          target: true,
          linkName: true,
        },
      });

      const incoming = await db.query.link.findMany({
        where: eq(link.targetId, parsed.conceptId),
        with: {
          source: true,
          target: true,
          linkName: true,
        },
      });

      return { outgoing, incoming };
    } catch (error: unknown) {
      if (!isDrizzleRelationError(error)) {
        throw new Error(`Failed to load links: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      // Fallback
      const outgoingData = await db
        .select()
        .from(link)
        .where(eq(link.sourceId, parsed.conceptId));

      const incomingData = await db
        .select()
        .from(link)
        .where(eq(link.targetId, parsed.conceptId));

      const allLinks = [...outgoingData, ...incomingData];
      if (allLinks.length === 0) {
        return { outgoing: [], incoming: [] };
      }

      const sourceIds = [...new Set(allLinks.map(l => l.sourceId))];
      const targetIds = [...new Set(allLinks.map(l => l.targetId))];
      const linkNameIds = [...new Set(allLinks.map(l => l.linkNameId))];

      const [allSources, allTargets, allLinkNames] = await Promise.all([
        sourceIds.length > 0 ? db.select().from(concept).where(inArray(concept.id, sourceIds)) : [],
        targetIds.length > 0 ? db.select().from(concept).where(inArray(concept.id, targetIds)) : [],
        linkNameIds.length > 0 ? db.select().from(linkName).where(inArray(linkName.id, linkNameIds)) : [],
      ]);

      const sourceMap = new Map(allSources.map(c => [c.id, c]));
      const targetMap = new Map(allTargets.map(c => [c.id, c]));
      const linkNameMap = new Map(allLinkNames.map(ln => [ln.id, ln]));

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
    }
  });

  // Create link
  ipcMain.handle("link:create", async (_event, input: unknown) => {
    const parsed = z.object({
      sourceId: z.string(),
      targetId: z.string(),
      linkNameId: z.string().min(1),
      notes: z.string().optional(),
    }).parse(input);
    
    const db = getDb();

    const linkNameRecord = await db.query.linkName.findFirst({
      where: eq(linkName.id, parsed.linkNameId),
    });

    if (!linkNameRecord) {
      throw new Error("Link name not found");
    }

    const existingLinks = await db
      .select()
      .from(link)
      .where(
        and(
          eq(link.sourceId, parsed.sourceId),
          eq(link.targetId, parsed.targetId),
        )!,
      );
    const existing = existingLinks[0];

    if (existing) {
      const [updatedLink] = await db
        .update(link)
        .set({
          linkNameId: parsed.linkNameId,
          notes: parsed.notes ?? null,
        })
        .where(eq(link.id, existing.id))
        .returning();

      try {
        const fullLink = await db.query.link.findFirst({
          where: eq(link.id, updatedLink.id),
          with: {
            source: true,
            target: true,
            linkName: true,
          },
        });
        return fullLink!;
      } catch {
        const [sourceResult, targetResult, linkNameResult] = await Promise.all([
          db.select().from(concept).where(eq(concept.id, updatedLink.sourceId)).limit(1),
          db.select().from(concept).where(eq(concept.id, updatedLink.targetId)).limit(1),
          db.select().from(linkName).where(eq(linkName.id, updatedLink.linkNameId)).limit(1),
        ]);

        return {
          ...updatedLink,
          source: sourceResult[0] || null,
          target: targetResult[0] || null,
          linkName: linkNameResult[0] || null,
        };
      }
    }

    const [newLink] = await db
      .insert(link)
      .values({
        sourceId: parsed.sourceId,
        targetId: parsed.targetId,
        linkNameId: parsed.linkNameId,
        notes: parsed.notes ?? null,
      })
      .returning();

    try {
      const fullLink = await db.query.link.findFirst({
        where: eq(link.id, newLink.id),
        with: {
          source: true,
          target: true,
          linkName: true,
        },
      });
      return fullLink!;
    } catch {
      const [sourceResult, targetResult, linkNameResult] = await Promise.all([
        db.select().from(concept).where(eq(concept.id, newLink.sourceId)).limit(1),
        db.select().from(concept).where(eq(concept.id, newLink.targetId)).limit(1),
        db.select().from(linkName).where(eq(linkName.id, newLink.linkNameId)).limit(1),
      ]);

      return {
        ...newLink,
        source: sourceResult[0] || null,
        target: targetResult[0] || null,
        linkName: linkNameResult[0] || null,
      };
    }
  });

  // Delete link
  ipcMain.handle("link:delete", async (_event, input: unknown) => {
    const parsed = z.object({
      sourceId: z.string(),
      targetId: z.string(),
    }).parse(input);
    
    const db = getDb();

    const allLinksData = await db.select().from(link);
    const foundLink = allLinksData.find(
      (l) => l.sourceId === parsed.sourceId && l.targetId === parsed.targetId,
    );

    if (!foundLink) {
      return null;
    }

    await db.delete(link).where(eq(link.id, foundLink.id));
    return foundLink;
  });
}

