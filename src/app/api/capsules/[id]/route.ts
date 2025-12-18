/**
 * REST API routes for individual capsules
 * GET /api/capsules/[id] - Get capsule by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";

// GET /api/capsules/[id] - Get capsule by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id } = await params;

    // Fetch capsule
    const capsule = await db.capsule.findUnique({
      where: { id },
    });

    if (!capsule) {
      return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
    }

    // Fetch anchors
    const anchors = await db.anchor.findMany({
      where: { capsuleId: id },
      orderBy: { createdAt: "asc" },
    });

    // Fetch repurposed content
    const anchorIds = anchors.map((a) => a.id);
    const repurposedContent = anchorIds.length > 0
      ? await db.repurposedContent.findMany({
          where: { anchorId: { in: anchorIds } },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            anchorId: true,
            type: true,
            content: true,
            guidance: true,
            createdAt: true,
          },
        })
      : [];

    // Combine data
    const repurposedByAnchorId = new Map<string, typeof repurposedContent>();
    for (const repurposed of repurposedContent) {
      if (!repurposedByAnchorId.has(repurposed.anchorId)) {
        repurposedByAnchorId.set(repurposed.anchorId, []);
      }
      repurposedByAnchorId.get(repurposed.anchorId)!.push(repurposed);
    }

    const capsuleWithAnchors = {
      ...capsule,
      anchors: anchors.map((anchor) => ({
        ...anchor,
        repurposedContent: repurposedByAnchorId.get(anchor.id) || [],
      })),
    };

    return NextResponse.json(capsuleWithAnchors);
  } catch (error) {
    return handleApiError(error);
  }
}

