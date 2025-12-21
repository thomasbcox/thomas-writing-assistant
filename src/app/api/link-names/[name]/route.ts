/**
 * REST API routes for individual link names
 * PUT /api/link-names/[name] - Update link name
 * DELETE /api/link-names/[name] - Delete link name
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, getDb, parseJsonBody } from "~/server/api/helpers";
import { eq, or } from "drizzle-orm";
import { linkName, link } from "~/server/schema";

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

const updateLinkNameSchema = z.object({
  newName: z.string().min(1).trim(),
});

// PUT /api/link-names/[name] - Update link name
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const db = getDb();
    const { name: oldName } = await params;
    const body = await parseJsonBody(request);
    const input = updateLinkNameSchema.parse(body);
    const trimmedNewName = input.newName.trim();

    if (!trimmedNewName) {
      return NextResponse.json(
        { error: "New name cannot be empty" },
        { status: 400 },
      );
    }

    // Find the LinkName pair by old name (check both forward and reverse)
    const oldLinkName = await db.query.linkName.findFirst({
      where: or(
        eq(linkName.forwardName, oldName),
        eq(linkName.reverseName, oldName),
      )!,
    });

    if (!oldLinkName) {
      return NextResponse.json(
        { error: "Link name not found" },
        { status: 404 },
      );
    }

    // Update the LinkName pair
    await db
      .update(linkName)
      .set({
        forwardName: oldLinkName.forwardName === oldName ? trimmedNewName : oldLinkName.forwardName,
        reverseName: oldLinkName.reverseName === oldName ? trimmedNewName : oldLinkName.reverseName,
      })
      .where(eq(linkName.id, oldLinkName.id));

    return NextResponse.json({ success: true, updated: oldLinkName.id });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/link-names/[name] - Delete link name
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const db = getDb();
    const { name } = await params;
    const replaceWith =
      new URL(request.url).searchParams.get("replaceWith") || undefined;

    const isDefault = DEFAULT_LINK_NAMES.includes(name);

    // Find the LinkName pair by name (check both forward and reverse)
    const linkNameToDelete = await db.query.linkName.findFirst({
      where: or(
        eq(linkName.forwardName, name),
        eq(linkName.reverseName, name),
      )!,
    });

    if (!linkNameToDelete) {
      return NextResponse.json(
        { error: "Link name not found" },
        { status: 404 },
      );
    }

    // Check usage - find all links using this LinkName pair
    const linksUsingName = await db
      .select()
      .from(link)
      .where(eq(link.linkNameId, linkNameToDelete.id));

    const usageCount = linksUsingName.length;

    if (isDefault && usageCount > 0 && !replaceWith) {
      return NextResponse.json(
        {
          error:
            "Cannot delete default link name that is in use without replacement",
        },
        { status: 400 },
      );
    }

    if (replaceWith && usageCount > 0) {
      // Find replacement LinkName pair
      const replacementLinkName = await db.query.linkName.findFirst({
        where: or(
          eq(linkName.forwardName, replaceWith),
          eq(linkName.reverseName, replaceWith),
        )!,
      });

      if (!replacementLinkName) {
        return NextResponse.json(
          { error: "Replacement link name not found" },
          { status: 400 },
        );
      }

      // Replace all usages
      await db
        .update(link)
        .set({ linkNameId: replacementLinkName.id })
        .where(eq(link.linkNameId, linkNameToDelete.id));
    }

    // Delete or mark as deleted
    if (isDefault) {
      await db
        .update(linkName)
        .set({ isDeleted: true })
        .where(eq(linkName.id, linkNameToDelete.id));
    } else {
      // Hard delete custom link names
      await db.delete(linkName).where(eq(linkName.id, linkNameToDelete.id));
    }

    return NextResponse.json({ success: true, deletedCount: usageCount });
  } catch (error) {
    return handleApiError(error);
  }
}
