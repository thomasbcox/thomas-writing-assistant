/**
 * REST API routes for individual repurposed content
 * PUT /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId] - Update repurposed content
 * DELETE /api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId] - Delete repurposed content
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { eq } from "drizzle-orm";
import { repurposedContent } from "~/server/schema";

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

    const foundRepurposed = await (db.query as any).repurposedContent.findFirst({
      where: eq(repurposedContent.id, repurposedId),
    });

    if (!foundRepurposed) {
      return NextResponse.json(
        { error: "Repurposed content not found" },
        { status: 404 },
      );
    }

    const updateData: {
      type?: string;
      content?: string;
      guidance?: string | null;
    } = {};

    if (input.type !== undefined) updateData.type = input.type;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.guidance !== undefined) updateData.guidance = input.guidance;

    const [updatedRepurposed] = await db
      .update(repurposedContent)
      .set(updateData)
      .where(eq(repurposedContent.id, repurposedId))
      .returning();

    return NextResponse.json(updatedRepurposed);
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

    const foundRepurposed = await (db.query as any).repurposedContent.findFirst({
      where: eq(repurposedContent.id, repurposedId),
    });

    if (!foundRepurposed) {
      return NextResponse.json(
        { error: "Repurposed content not found" },
        { status: 404 },
      );
    }

    await db
      .delete(repurposedContent)
      .where(eq(repurposedContent.id, repurposedId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
