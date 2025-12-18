/**
 * REST API routes for capsule anchors
 * POST /api/capsules/[id]/anchors - Create anchor
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";

const createAnchorSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  painPoints: z.array(z.string()).optional(),
  solutionSteps: z.array(z.string()).optional(),
  proof: z.string().optional(),
});

// POST /api/capsules/[id]/anchors - Create anchor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id: capsuleId } = await params;
    const body = await parseJsonBody(request);
    const input = createAnchorSchema.parse(body);

    const anchor = await db.anchor.create({
      data: {
        capsuleId,
        title: input.title,
        content: input.content,
        painPoints: input.painPoints ? JSON.stringify(input.painPoints) : null,
        solutionSteps: input.solutionSteps ? JSON.stringify(input.solutionSteps) : null,
        proof: input.proof,
      },
    });

    return NextResponse.json(anchor, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

