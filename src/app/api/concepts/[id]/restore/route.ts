/**
 * REST API route to restore a concept from trash
 * POST /api/concepts/[id]/restore
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id } = await params;

    const concept = await db.concept.update({
      where: { id },
      data: {
        status: "active",
        trashedAt: null,
      },
    });

    return NextResponse.json(concept);
  } catch (error) {
    return handleApiError(error);
  }
}

