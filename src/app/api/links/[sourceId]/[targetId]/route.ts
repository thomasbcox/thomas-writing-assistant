/**
 * REST API route to delete a link
 * DELETE /api/links/[sourceId]/[targetId]
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";
import { and, eq } from "drizzle-orm";
import { link } from "~/server/schema";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string; targetId: string }> },
) {
  try {
    const db = getDb();
    const { sourceId, targetId } = await params;

    const foundLinks = await db
      .select()
      .from(link)
      .where(
        and(
          eq(link.sourceId, sourceId),
          eq(link.targetId, targetId),
        )!,
      );
    const foundLink = foundLinks[0];

    if (!foundLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    await db.delete(link).where(eq(link.id, foundLink.id));

    return NextResponse.json(foundLink);
  } catch (error) {
    return handleApiError(error);
  }
}
