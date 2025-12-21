/**
 * REST API route to permanently delete trashed concepts
 * POST /api/concepts/purge-trash
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { and, eq, lte } from "drizzle-orm";
import { concept } from "~/server/schema";

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

    const result = await db
      .delete(concept)
      .where(
        and(
          eq(concept.status, "trash"),
          lte(concept.trashedAt, cutoffDate),
        )!,
      );

    return NextResponse.json({ deletedCount: result.changes });
  } catch (error) {
    return handleApiError(error);
  }
}
