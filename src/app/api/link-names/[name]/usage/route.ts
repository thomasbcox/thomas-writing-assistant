/**
 * REST API route to get link name usage
 * GET /api/link-names/[name]/usage - Get link name usage
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError, getDb } from "~/server/api/helpers";

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

// GET /api/link-names/[name]/usage - Get link name usage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const db = getDb();
    const { name } = await params;

    const links = await db.link.findMany({
      where: {
        OR: [
          { forwardName: name },
          { reverseName: name },
        ],
      },
      include: {
        source: true,
        target: true,
      },
    });

    const isDefault = DEFAULT_LINK_NAMES.includes(name);

    return NextResponse.json({
      name,
      count: links.length,
      links: links.map((link) => ({
        id: link.id,
        sourceId: link.sourceId,
        targetId: link.targetId,
        sourceTitle: link.source.title,
        targetTitle: link.target.title,
      })),
      isDefault,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
