/**
 * REST API routes for individual anchors
 * PUT /api/capsules/[id]/anchors/[anchorId] - Update anchor
 * DELETE /api/capsules/[id]/anchors/[anchorId] - Delete anchor
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { eq } from "drizzle-orm";
import { anchor, repurposedContent } from "~/server/schema";

const updateAnchorSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  painPoints: z.array(z.string()).optional(),
  solutionSteps: z.array(z.string()).optional(),
  proof: z.string().optional(),
});

// PUT /api/capsules/[id]/anchors/[anchorId] - Update anchor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anchorId: string }> },
) {
  try {
    const db = getDb();
    const { anchorId } = await params;
    const body = await parseJsonBody(request);
    const input = updateAnchorSchema.parse(body);

    const foundAnchor = await db.query.anchor.findFirst({
      where: eq(anchor.id, anchorId),
    });

    if (!foundAnchor) {
      return NextResponse.json(
        { error: "Anchor not found" },
        { status: 404 },
      );
    }

    const updateData: {
      title?: string;
      content?: string;
      painPoints?: string | null;
      solutionSteps?: string | null;
      proof?: string | null;
    } = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.painPoints !== undefined) {
      updateData.painPoints =
        input.painPoints.length > 0 ? JSON.stringify(input.painPoints) : null;
    }
    if (input.solutionSteps !== undefined) {
      updateData.solutionSteps =
        input.solutionSteps.length > 0
          ? JSON.stringify(input.solutionSteps)
          : null;
    }
    if (input.proof !== undefined) updateData.proof = input.proof || null;

    const [updatedAnchor] = await db
      .update(anchor)
      .set(updateData)
      .where(eq(anchor.id, anchorId))
      .returning();

    return NextResponse.json(updatedAnchor);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/capsules/[id]/anchors/[anchorId] - Delete anchor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anchorId: string }> },
) {
  try {
    const db = getDb();
    const { anchorId } = await params;

    const foundAnchor = await db.query.anchor.findFirst({
      where: eq(anchor.id, anchorId),
    });

    if (!foundAnchor) {
      return NextResponse.json(
        { error: "Anchor not found" },
        { status: 404 },
      );
    }

    // Delete repurposed content first (cascade handled by DB)
    await db
      .delete(repurposedContent)
      .where(eq(repurposedContent.anchorId, anchorId));

    // Delete anchor
    await db.delete(anchor).where(eq(anchor.id, anchorId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
