import { ipcMain } from "electron";
import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { link, linkName, concept } from "../../src/server/schema.js";
import { getDb } from "../db.js";
import { logger } from "../../src/lib/logger.js";
import { serializeLink, serializeLinkName, serializeConcept, serializeLinkWithRelations } from "../../src/lib/serializers.js";
import { handleIpc } from "./ipc-wrapper.js";

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
  ipcMain.handle("link:getAll", handleIpc(async (_event, input: unknown) => {
    const parsed = z.object({
      summary: z.boolean().optional().default(false),
    }).optional().parse(input);
    
    const db = getDb();
    const summaryOnly = parsed?.summary ?? false;

    logger.info({ operation: "link:getAll", summary: summaryOnly }, "Fetching all links");

    if (summaryOnly) {
      const links = await db
        .select({ 
          id: link.id,
          sourceId: link.sourceId,
          targetId: link.targetId,
        })
        .from(link)
        .orderBy(desc(link.createdAt));
      logger.info({ operation: "link:getAll", count: links.length, summary: true }, "Links fetched successfully");
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
      logger.info({ operation: "link:getAll", count: links.length }, "Links fetched successfully");
      return links;
    } catch (error: unknown) {
      if (!isDrizzleRelationError(error)) {
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

      const sourceMap = new Map(allSources.map(c => [c.id, c] as [string, typeof c]));
      const targetMap = new Map(allTargets.map(c => [c.id, c] as [string, typeof c]));
      const linkNameMap = new Map(allLinkNames.map(ln => [ln.id, ln] as [string, typeof ln]));

      return linksData.map(l => serializeLinkWithRelations({
        ...l,
        source: sourceMap.get(l.sourceId) || null,
        target: targetMap.get(l.targetId) || null,
        linkName: linkNameMap.get(l.linkNameId) || null,
      }));
    }
  }, "link:getAll"));

  // Get links by concept
  ipcMain.handle("link:getByConcept", handleIpc(async (_event, input: unknown) => {
    const parsed = z.object({ conceptId: z.string() }).parse(input);
    const db = getDb();

    logger.info({ operation: "link:getByConcept", conceptId: parsed.conceptId }, "Fetching links for concept");

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

      logger.info({ operation: "link:getByConcept", conceptId: parsed.conceptId, outgoing: outgoing.length, incoming: incoming.length }, "Links for concept fetched successfully");
      return { 
        outgoing: outgoing.map(serializeLinkWithRelations), 
        incoming: incoming.map(serializeLinkWithRelations) 
      };
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

      const sourceMap = new Map(allSources.map(c => [c.id, c] as [string, typeof c]));
      const targetMap = new Map(allTargets.map(c => [c.id, c] as [string, typeof c]));
      const linkNameMap = new Map(allLinkNames.map(ln => [ln.id, ln] as [string, typeof ln]));

      const mapLink = (l: typeof outgoingData[0]) => serializeLinkWithRelations({
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
  }, "link:getByConcept"));

  // Create link
  ipcMain.handle("link:create", handleIpc(async (_event, input: unknown) => {
    const parsed = z.object({
      sourceId: z.string(),
      targetId: z.string(),
      linkNameId: z.string().min(1),
      notes: z.string().optional(),
    }).parse(input);
    
    const db = getDb();

    logger.info({ operation: "link:create", sourceId: parsed.sourceId, targetId: parsed.targetId, linkNameId: parsed.linkNameId }, "Creating link");

    const linkNameRecord = await db.query.linkName.findFirst({
      where: eq(linkName.id, parsed.linkNameId),
    });

    if (!linkNameRecord) {
      logger.warn({ operation: "link:create", linkNameId: parsed.linkNameId }, "Link name not found");
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
      logger.info({ operation: "link:create", existingLinkId: existing.id }, "Updating existing link");
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
        return serializeLinkWithRelations(fullLink!);
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

    logger.info({ operation: "link:create", linkId: newLink.id, sourceId: parsed.sourceId, targetId: parsed.targetId }, "Link created successfully");

    try {
      const fullLink = await db.query.link.findFirst({
        where: eq(link.id, newLink.id),
        with: {
          source: true,
          target: true,
          linkName: true,
        },
      });
      return serializeLinkWithRelations(fullLink!);
    } catch (error) {
      const [sourceResult, targetResult, linkNameResult] = await Promise.all([
        db.select().from(concept).where(eq(concept.id, newLink.sourceId)).limit(1),
        db.select().from(concept).where(eq(concept.id, newLink.targetId)).limit(1),
        db.select().from(linkName).where(eq(linkName.id, newLink.linkNameId)).limit(1),
      ]);

      return serializeLinkWithRelations({
        ...newLink,
        source: sourceResult[0] || null,
        target: targetResult[0] || null,
        linkName: linkNameResult[0] || null,
      });
    }
  }, "link:create"));

  // Update link
  ipcMain.handle("link:update", handleIpc(async (_event, input: unknown) => {
    const parsed = z.object({
      id: z.string(),
      linkNameId: z.string().optional(),
      notes: z.string().optional(),
    }).parse(input);
    
    const db = getDb();

    logger.info({ operation: "link:update", linkId: parsed.id }, "Updating link");

    const updateData: { linkNameId?: string; notes?: string | null } = {};
    if (parsed.linkNameId !== undefined) {
      updateData.linkNameId = parsed.linkNameId;
    }
    if (parsed.notes !== undefined) {
      updateData.notes = parsed.notes || null;
    }

    if (Object.keys(updateData).length === 0) {
      logger.warn({ operation: "link:update", linkId: parsed.id }, "No fields to update");
      throw new Error("No fields provided for update");
    }

    const [updatedLink] = await db
      .update(link)
      .set(updateData)
      .where(eq(link.id, parsed.id))
      .returning();

    if (!updatedLink) {
      logger.warn({ operation: "link:update", linkId: parsed.id }, "Link not found for update");
      throw new Error("Link not found");
    }

    logger.info({ operation: "link:update", linkId: parsed.id }, "Link updated successfully");

    try {
      const fullLink = await db.query.link.findFirst({
        where: eq(link.id, updatedLink.id),
        with: {
          source: true,
          target: true,
          linkName: true,
        },
      });
      return serializeLinkWithRelations(fullLink!);
    } catch {
      const [sourceResult, targetResult, linkNameResult] = await Promise.all([
        db.select().from(concept).where(eq(concept.id, updatedLink.sourceId)).limit(1),
        db.select().from(concept).where(eq(concept.id, updatedLink.targetId)).limit(1),
        db.select().from(linkName).where(eq(linkName.id, updatedLink.linkNameId)).limit(1),
      ]);

      return serializeLinkWithRelations({
        ...updatedLink,
        source: sourceResult[0] || null,
        target: targetResult[0] || null,
        linkName: linkNameResult[0] || null,
      });
    }
  }, "link:update"));

  // Delete link
  ipcMain.handle("link:delete", handleIpc(async (_event, input: unknown) => {
    const parsed = z.object({
      sourceId: z.string(),
      targetId: z.string(),
    }).parse(input);
    
    const db = getDb();

    logger.info({ operation: "link:delete", sourceId: parsed.sourceId, targetId: parsed.targetId }, "Deleting link");

    const allLinksData = await db.select().from(link);
    const foundLink = allLinksData.find(
      (l) => l.sourceId === parsed.sourceId && l.targetId === parsed.targetId,
    );

    if (!foundLink) {
      logger.warn({ operation: "link:delete", sourceId: parsed.sourceId, targetId: parsed.targetId }, "Link not found for deletion");
      return null;
    }

    await db.delete(link).where(eq(link.id, foundLink.id));
    logger.info({ operation: "link:delete", linkId: foundLink.id, sourceId: parsed.sourceId, targetId: parsed.targetId }, "Link deleted successfully");
    return foundLink;
  }, "link:delete"));

  // Get link counts by concept
  ipcMain.handle("link:getCountsByConcept", handleIpc(async (_event, _input: unknown) => {
    const db = getDb();

    logger.info({ operation: "link:getCountsByConcept" }, "Fetching link counts by concept");

    // Get all links
    const allLinks = await db.select({
      sourceId: link.sourceId,
      targetId: link.targetId,
    }).from(link);

    // Count links per concept (outgoing + incoming)
    const counts = new Map<string, number>();

    for (const l of allLinks) {
      // Count outgoing links
      const outgoingCount = counts.get(l.sourceId) || 0;
      counts.set(l.sourceId, outgoingCount + 1);

      // Count incoming links
      const incomingCount = counts.get(l.targetId) || 0;
      counts.set(l.targetId, incomingCount + 1);
    }

    // Convert to array format
    const result = Array.from(counts.entries()).map(([conceptId, count]) => ({
      conceptId,
      count,
    }));

    logger.info({ operation: "link:getCountsByConcept", count: result.length }, "Link counts fetched successfully");
    return result;
  }, "link:getCountsByConcept"));
}

