/**
 * REST API routes for individual repurposed content
 * PUT /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId] - Update repurposed content
 * DELETE /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId] - Delete repurposed content
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";

const updateRepurposedSchema = z.object({
  type: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  guidance: z.string().optional().nullable(),
});

// PUT /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId] - Update repurposed content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anchorId: string; repurposedId: string }> },
) {
  try {
    const db = getDb();
    const { repurposedId } = await params;
    const body = await parseJsonBody(request);
    const input = updateRepurposedSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (input.type !== undefined) updateData.type = input.type;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.guidance !== undefined) updateData.guidance = input.guidance;

    const repurposed = await db.repurposedContent.update({
      where: { id: repurposedId },
      data: updateData,
    });

    return NextResponse.json(repurposed);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId] - Delete repurposed content
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anchorId: string; repurposedId: string }> },
) {
  try {
    const db = getDb();
    const { repurposedId } = await params;

    await db.repurposedContent.delete({
      where: { id: repurposedId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

