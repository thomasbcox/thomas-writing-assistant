/**
 * REST API routes for links
 * GET /api/links - Get links (query param: conceptId)
 * POST /api/links - Create link
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody, getQueryParam } from "~/server/api/helpers";
import { eq, and, desc } from "drizzle-orm";
import { link, linkName } from "~/server/schema";

const createLinkSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  linkNameId: z.string().min(1),
  notes: z.string().optional(),
});

// GET /api/links - Get links
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const conceptId = getQueryParam(request, "conceptId");

    if (conceptId) {
      // Get links for a specific concept
      const outgoing = await db.query.link.findMany({
        where: eq(link.sourceId, conceptId),
        with: {
          target: true,
          source: true,
          linkName: true,
        },
      });

      const incoming = await db.query.link.findMany({
        where: eq(link.targetId, conceptId),
        with: {
          source: true,
          target: true,
          linkName: true,
        },
      });

      return NextResponse.json({ outgoing, incoming });
    }

    // Get all links
    const links = await db.query.link.findMany({
      with: {
        source: true,
        target: true,
        linkName: true,
      },
      orderBy: [desc(link.createdAt)],
    });

    return NextResponse.json(links);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/links - Create link
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await parseJsonBody(request);
    const input = createLinkSchema.parse(body);

    // Verify linkNameId exists
    const linkNameRecord = await db.query.linkName.findFirst({
      where: eq(linkName.id, input.linkNameId),
    });

    if (!linkNameRecord) {
      return NextResponse.json(
        { error: "Link name not found" },
        { status: 400 },
      );
    }

    // Check if link already exists
    const existingLinks = await db
      .select()
      .from(link)
      .where(
        and(
          eq(link.sourceId, input.sourceId),
          eq(link.targetId, input.targetId),
        )!,
      );
    const existing = existingLinks[0];

    let linkRecord;
    if (existing) {
      // Update existing link
      const [updated] = await db
        .update(link)
        .set({
          linkNameId: input.linkNameId,
          notes: input.notes ?? null,
        })
        .where(eq(link.id, existing.id))
        .returning();

      linkRecord = await db.query.link.findFirst({
        where: eq(link.id, updated.id),
        with: {
          source: true,
          target: true,
          linkName: true,
        },
      });
    } else {
      // Create new link
      const [newLink] = await db
        .insert(link)
        .values({
          sourceId: input.sourceId,
          targetId: input.targetId,
          linkNameId: input.linkNameId,
          notes: input.notes ?? null,
        })
        .returning();

      linkRecord = await db.query.link.findFirst({
        where: eq(link.id, newLink.id),
        with: {
          source: true,
          target: true,
          linkName: true,
        },
      });
    }

    return NextResponse.json(linkRecord!, { status: existing ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
