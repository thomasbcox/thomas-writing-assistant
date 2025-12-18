/**
 * REST API routes for repurposed content
 * POST /api/capsules/[id]/anchors/[anchorId]/repurposed - Create repurposed content
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";

const createRepurposedSchema = z.object({
  type: z.string().min(1),
  content: z.string().min(1),
  guidance: z.string().optional(),
});

// POST /api/capsules/[id]/anchors/[anchorId]/repurposed - Create repurposed content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anchorId: string }> },
) {
  try {
    const db = getDb();
    const { anchorId } = await params;
    const body = await parseJsonBody(request);
    const input = createRepurposedSchema.parse(body);

    const repurposed = await db.repurposedContent.create({
      data: {
        anchorId,
        type: input.type,
        content: input.content,
        guidance: input.guidance ?? null,
      },
    });

    return NextResponse.json(repurposed, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

