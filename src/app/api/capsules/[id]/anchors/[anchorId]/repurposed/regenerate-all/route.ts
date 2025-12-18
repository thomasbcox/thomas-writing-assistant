/**
 * REST API route to regenerate all repurposed content for an anchor
 * POST /api/capsules/[id]/anchors/[anchorId]/repurposed/regenerate-all
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError, getDb } from "~/server/api/helpers";
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";
import { safeJsonParseArray } from "~/lib/json-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anchorId: string }> },
) {
  try {
    const db = getDb();
    const { anchorId } = await params;

    // Get the anchor
    const anchor = await db.anchor.findUnique({
      where: { id: anchorId },
    });

    if (!anchor) {
      return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
    }

    // Parse pain points and solution steps
    const painPoints = safeJsonParseArray<string>(anchor.painPoints, []) ?? [];
    const solutionSteps = safeJsonParseArray<string>(anchor.solutionSteps, []) ?? [];

    // Generate new repurposed content
    const { repurposeAnchorContent } = await import("~/server/services/repurposer");
    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();
    
    const repurposed = await repurposeAnchorContent(
      anchor.title,
      anchor.content,
      Array.isArray(painPoints) ? painPoints : null,
      Array.isArray(solutionSteps) ? solutionSteps : null,
      llmClient,
      configLoader,
    );

    // Delete existing repurposed content
    await db.repurposedContent.deleteMany({
      where: { anchorId },
    });

    // Save new repurposed content
    const savedRepurposed = [];
    for (const item of repurposed) {
      const created = await db.repurposedContent.create({
        data: {
          anchorId,
          type: item.type,
          content: item.content,
          guidance: item.guidance ?? null,
        },
      });
      savedRepurposed.push(created);
    }

    return NextResponse.json({
      repurposedContent: savedRepurposed,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

