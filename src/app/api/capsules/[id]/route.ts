/**
 * REST API routes for individual capsules
 * GET /api/capsules/[id] - Get capsule by ID
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";
import { eq, inArray } from "drizzle-orm";
import { capsule, anchor, repurposedContent } from "~/server/schema";

// GET /api/capsules/[id] - Get capsule by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id } = await params;

    // Fetch capsule
    const foundCapsule = await db.query.capsule.findFirst({
      where: eq(capsule.id, id),
    });

    if (!foundCapsule) {
      return NextResponse.json(
        { error: "Capsule not found" },
        { status: 404 },
      );
    }

    // Fetch anchors
    const anchors = await db
      .select()
      .from(anchor)
      .where(eq(anchor.capsuleId, id))
      .orderBy(anchor.createdAt);

    // Fetch repurposed content
    const anchorIds = anchors.map((a) => a.id);
    const repurposed =
      anchorIds.length > 0
        ? await db
            .select()
            .from(repurposedContent)
            .where(inArray(repurposedContent.anchorId, anchorIds))
            .orderBy(repurposedContent.createdAt)
        : [];

    // Combine data
    const repurposedByAnchorId = new Map<string, typeof repurposed>();
    for (const repurposedRecord of repurposed) {
      if (!repurposedByAnchorId.has(repurposedRecord.anchorId)) {
        repurposedByAnchorId.set(repurposedRecord.anchorId, []);
      }
      repurposedByAnchorId.get(repurposedRecord.anchorId)!.push(repurposedRecord);
    }

    const capsuleWithAnchors = {
      ...foundCapsule,
      anchors: anchors.map((anchorRecord) => ({
        ...anchorRecord,
        repurposedContent:
          repurposedByAnchorId.get(anchorRecord.id) || [],
      })),
    };

    return NextResponse.json(capsuleWithAnchors);
  } catch (error) {
    return handleApiError(error);
  }
}
