/**
 * REST API routes for capsule anchors
 * POST /api/capsules/[id]/anchors - Create anchor
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { eq } from "drizzle-orm";
import { anchor, capsule } from "~/server/schema";

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

    // Verify capsule exists
    const foundCapsule = await db.query.capsule.findFirst({
      where: eq(capsule.id, capsuleId),
    });

    if (!foundCapsule) {
      return NextResponse.json(
        { error: "Capsule not found" },
        { status: 404 },
      );
    }

    const [newAnchor] = await db
      .insert(anchor)
      .values({
        capsuleId,
        title: input.title,
        content: input.content,
        painPoints: input.painPoints ? JSON.stringify(input.painPoints) : null,
        solutionSteps: input.solutionSteps
          ? JSON.stringify(input.solutionSteps)
          : null,
        proof: input.proof ?? null,
      })
      .returning();

    return NextResponse.json(newAnchor, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
