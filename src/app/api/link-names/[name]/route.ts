/**
 * REST API routes for individual link names
 * PUT /api/link-names/[name] - Update link name
 * DELETE /api/link-names/[name] - Delete link name
 * GET /api/link-names/[name]/usage - Get link name usage
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, getDb, parseJsonBody } from "~/server/api/helpers";

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
      return NextResponse.json({ error: "New name cannot be empty" }, { status: 400 });
    }

    // Update all links using the old name
    const linksToUpdate = await db.link.findMany({
      where: {
        OR: [
          { forwardName: oldName },
          { reverseName: oldName },
        ],
      },
    });

    let updatedCount = 0;
    for (const link of linksToUpdate) {
      const updateData: {
        forwardName?: string;
        reverseName?: string;
      } = {};

      if (link.forwardName === oldName) {
        updateData.forwardName = trimmedNewName;
      }

      if (link.reverseName === oldName) {
        updateData.reverseName = trimmedNewName;
      }

      if (Object.keys(updateData).length > 0) {
        await db.link.update({
          where: { id: link.id },
          data: updateData,
        });
        updatedCount++;
      }
    }

    // Update link name record
    const oldLinkName = await db.linkName.findUnique({
      where: { name: oldName },
    });

    if (oldLinkName) {
      await db.linkName.delete({
        where: { name: oldName },
      });
    }

    // Create new link name if it doesn't exist
    const newLinkNameExists = await db.linkName.findUnique({
      where: { name: trimmedNewName },
    });

    if (!newLinkNameExists) {
      await db.linkName.create({
        data: {
          name: trimmedNewName,
          isDefault: false,
        },
      });
    }

    return NextResponse.json({ updatedCount, success: true });
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
    const replaceWith = new URL(request.url).searchParams.get("replaceWith") || undefined;

    const isDefault = DEFAULT_LINK_NAMES.includes(name);

    // Check usage
    const usageCount = await db.link.count({
      where: {
        OR: [
          { forwardName: name },
          { reverseName: name },
        ],
      },
    });

    if (isDefault && usageCount > 0 && !replaceWith) {
      return NextResponse.json(
        { error: "Cannot delete default link name that is in use without replacement" },
        { status: 400 },
      );
    }

    if (replaceWith && usageCount > 0) {
      // Replace all usages
      const linksToUpdate = await db.link.findMany({
        where: {
          OR: [
            { forwardName: name },
            { reverseName: name },
          ],
        },
      });

      for (const link of linksToUpdate) {
        const updateData: {
          forwardName?: string;
          reverseName?: string;
        } = {};

        if (link.forwardName === name) {
          updateData.forwardName = replaceWith;
        }

        if (link.reverseName === name) {
          updateData.reverseName = replaceWith;
        }

        if (Object.keys(updateData).length > 0) {
          await db.link.update({
            where: { id: link.id },
            data: updateData,
          });
        }
      }
    }

    // Delete or mark as deleted
    if (isDefault) {
      const existing = await db.linkName.findUnique({
        where: { name },
      });

      if (existing) {
        await db.linkName.update({
          where: { name },
          data: { isDeleted: true },
        });
      } else {
        await db.linkName.create({
          data: {
            name,
            isDefault: true,
            isDeleted: true,
          },
        });
      }
    } else {
      await db.linkName.delete({
        where: { name },
      });
    }

    return NextResponse.json({ success: true, deletedCount: usageCount });
  } catch (error) {
    return handleApiError(error);
  }
}

// Note: GET handler moved to [name]/usage/route.ts to match hook expectations

