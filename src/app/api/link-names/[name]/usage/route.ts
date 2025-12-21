/**
 * REST API route to get link name usage
 * GET /api/link-names/[name]/usage - Get link name usage
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError, getDb } from "~/server/api/helpers";
import { eq } from "drizzle-orm";
import { link, linkName } from "~/server/schema";

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

    // Find the LinkName pair by name (check both forward and reverse)
    const linkNameRecord = await db.query.linkName.findFirst({
      where: (linkNames, { or }) =>
        or(
          eq(linkNames.forwardName, name),
          eq(linkNames.reverseName, name),
        )!,
    });

    if (!linkNameRecord) {
      return NextResponse.json({
        name,
        count: 0,
        links: [],
        isDefault: DEFAULT_LINK_NAMES.includes(name),
      });
    }

    // Get all links using this LinkName pair
    const links = await db.query.link.findMany({
      where: eq(link.linkNameId, linkNameRecord.id),
      with: {
        source: true,
        target: true,
      },
    });

    const isDefault = DEFAULT_LINK_NAMES.includes(name);

    return NextResponse.json({
      name,
      count: links.length,
      links: links.map((linkRecord) => ({
        id: linkRecord.id,
        sourceId: linkRecord.sourceId,
        targetId: linkRecord.targetId,
        sourceTitle: linkRecord.source?.title || "Unknown",
        targetTitle: linkRecord.target?.title || "Unknown",
      })),
      isDefault,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
