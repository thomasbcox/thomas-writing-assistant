/**
 * REST API route to regenerate all repurposed content for an anchor
 * POST /api/capsules/[id]/anchors/[anchorId]/repurposed/regenerate-all
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError, getDb } from "~/server/api/helpers";
import { getDependencies } from "~/server/dependencies";
import { safeJsonParseArray } from "~/lib/json-utils";
import { eq } from "drizzle-orm";
import { anchor, repurposedContent } from "~/server/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anchorId: string }> },
) {
  try {
    const db = getDb();
    const { anchorId } = await params;

    // Get the anchor
    const foundAnchor = await db.query.anchor.findFirst({
      where: eq(anchor.id, anchorId),
    });

    if (!foundAnchor) {
      return NextResponse.json(
        { error: "Anchor not found" },
        { status: 404 },
      );
    }

    // Parse pain points and solution steps
    const painPoints =
      safeJsonParseArray<string>(foundAnchor.painPoints, []) ?? [];
    const solutionSteps =
      safeJsonParseArray<string>(foundAnchor.solutionSteps, []) ?? [];

    // Generate new repurposed content
    const { repurposeAnchorContent } = await import(
      "~/server/services/repurposer"
    );
    const { llmClient, configLoader } = getDependencies();

    const repurposed = await repurposeAnchorContent(
      foundAnchor.title,
      foundAnchor.content,
      Array.isArray(painPoints) ? painPoints : null,
      Array.isArray(solutionSteps) ? solutionSteps : null,
      llmClient,
      configLoader,
    );

    // Delete existing repurposed content
    await db
      .delete(repurposedContent)
      .where(eq(repurposedContent.anchorId, anchorId));

    // Save new repurposed content
    const savedRepurposed = [];
    for (const item of repurposed) {
      const [saved] = await db
        .insert(repurposedContent)
        .values({
          anchorId,
          type: item.type,
          content: item.content,
          guidance: item.guidance ?? null,
        })
        .returning();
      savedRepurposed.push(saved);
    }

    return NextResponse.json({
      repurposedContent: savedRepurposed,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
