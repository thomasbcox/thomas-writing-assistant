/**
 * REST API route to restore a concept from trash
 * POST /api/concepts/[id]/restore
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";
import { eq } from "drizzle-orm";
import { concept } from "~/server/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id } = await params;

    const foundConcept = await db.query.concept.findFirst({
      where: eq(concept.id, id),
    });

    if (!foundConcept) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    const [restoredConcept] = await db
      .update(concept)
      .set({
        status: "active",
        trashedAt: null,
      })
      .where(eq(concept.id, id))
      .returning();

    return NextResponse.json(restoredConcept);
  } catch (error) {
    return handleApiError(error);
  }
}
