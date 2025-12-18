/**
 * REST API routes for individual anchors
 * PUT /api/capsules/[id]/anchors/[anchorId] - Update anchor
 * DELETE /api/capsules/[id]/anchors/[anchorId] - Delete anchor
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";

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

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.painPoints !== undefined) updateData.painPoints = JSON.stringify(input.painPoints);
    if (input.solutionSteps !== undefined) updateData.solutionSteps = JSON.stringify(input.solutionSteps);
    if (input.proof !== undefined) updateData.proof = input.proof;

    const anchor = await db.anchor.update({
      where: { id: anchorId },
      data: updateData,
    });

    return NextResponse.json(anchor);
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

    await db.anchor.delete({
      where: { id: anchorId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

