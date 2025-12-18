/**
 * REST API route to delete a link
 * DELETE /api/links/[sourceId]/[targetId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string; targetId: string }> },
) {
  try {
    const db = getDb();
    const { sourceId, targetId } = await params;

    const link = await db.link.delete({
      where: {
        sourceId_targetId: {
          sourceId,
          targetId,
        },
      },
    });

    return NextResponse.json(link);
  } catch (error) {
    return handleApiError(error);
  }
}

