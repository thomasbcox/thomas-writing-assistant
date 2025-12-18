/**
 * REST API route to permanently delete trashed concepts
 * POST /api/concepts/purge-trash
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";

const purgeTrashSchema = z.object({
  daysOld: z.number().default(30),
});

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await parseJsonBody(request);
    const input = purgeTrashSchema.parse(body);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - input.daysOld);

    const result = await db.concept.deleteMany({
      where: {
        status: "trash",
        trashedAt: {
          lte: cutoffDate,
        },
      },
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}

