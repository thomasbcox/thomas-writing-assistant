import { ipcMain } from "electron";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { linkName, link } from "../../src/server/schema.js";
import { getDb } from "../db.js";
import { serializeLinkName } from "../../src/lib/serializers.js";

export function registerLinkNameHandlers() {
  // Get all link names
  ipcMain.handle("linkName:getAll", async (_event, input: unknown) => {
    const db = getDb();

    const linkNames = await db
      .select()
      .from(linkName)
      .where(eq(linkName.isDeleted, false))
      .orderBy(desc(linkName.createdAt));

    return linkNames.map(serializeLinkName);
  });

  // Create link name
  ipcMain.handle("linkName:create", async (_event, input: unknown) => {
    const parsed = z.object({
      forwardName: z.string().min(1),
      reverseName: z.string().optional(),
    }).parse(input);
    
    const db = getDb();

    const reverseName = parsed.reverseName || parsed.forwardName;
    const isSymmetric = parsed.forwardName === reverseName;

    // Check if forward name already exists
    const existing = await db.query.linkName.findFirst({
      where: eq(linkName.forwardName, parsed.forwardName),
    });

    if (existing && !existing.isDeleted) {
      throw new Error("Link name already exists");
    }

    const [newLinkName] = await db
      .insert(linkName)
      .values({
        forwardName: parsed.forwardName,
        reverseName,
        isSymmetric,
        isDefault: false,
        isDeleted: false,
      })
      .returning();

    return serializeLinkName(newLinkName);
  });

  // Update link name
  ipcMain.handle("linkName:update", async (_event, input: unknown) => {
    const parsed = z.object({
      id: z.string(),
      forwardName: z.string().min(1),
      reverseName: z.string().optional(),
    }).parse(input);
    
    const db = getDb();

    const reverseName = parsed.reverseName || parsed.forwardName;
    const isSymmetric = parsed.forwardName === reverseName;

    const [updatedLinkName] = await db
      .update(linkName)
      .set({
        forwardName: parsed.forwardName,
        reverseName,
        isSymmetric,
      })
      .where(eq(linkName.id, parsed.id))
      .returning();

    if (!updatedLinkName) {
      throw new Error("Link name not found");
    }

    return serializeLinkName(updatedLinkName);
  });

  // Delete link name
  ipcMain.handle("linkName:delete", async (_event, input: unknown) => {
    const parsed = z.object({
      id: z.string(),
      replaceWithId: z.string().optional(),
    }).parse(input);
    
    const db = getDb();

    // If replacing, update all links to use the replacement
    if (parsed.replaceWithId) {
      await db
        .update(link)
        .set({ linkNameId: parsed.replaceWithId })
        .where(eq(link.linkNameId, parsed.id));
    }

    // Soft delete the link name
    const [deletedLinkName] = await db
      .update(linkName)
      .set({ isDeleted: true })
      .where(eq(linkName.id, parsed.id))
      .returning();

    if (!deletedLinkName) {
      throw new Error("Link name not found");
    }

    return serializeLinkName(deletedLinkName);
  });

  // Get usage count for a link name
  ipcMain.handle("linkName:getUsage", async (_event, input: unknown) => {
    const parsed = z.object({ id: z.string() }).parse(input);
    const db = getDb();

    const links = await db
      .select()
      .from(link)
      .where(eq(link.linkNameId, parsed.id));

    return { count: links.length };
  });
}

