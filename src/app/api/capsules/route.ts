/**
 * REST API routes for capsules
 * GET /api/capsules - List all capsules
 * POST /api/capsules - Create capsule
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { eq, desc, inArray } from "drizzle-orm";
import { capsule, anchor, repurposedContent } from "~/server/schema";

const createCapsuleSchema = z.object({
  title: z.string().min(1),
  promise: z.string().min(1),
  cta: z.string().min(1),
  offerMapping: z.string().optional(),
});

// GET /api/capsules - List all capsules
export async function GET() {
  try {
    const db = getDb();

    // Fetch capsules
    const capsules = await db
      .select()
      .from(capsule)
      .orderBy(desc(capsule.createdAt));

    if (capsules.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch all anchors for these capsules
    const capsuleIds = capsules.map((c) => c.id);
    const anchors = await db
      .select()
      .from(anchor)
      .where(inArray(anchor.capsuleId, capsuleIds))
      .orderBy(anchor.createdAt);

    // Fetch all repurposed content for these anchors
    const anchorIds = anchors.map((a) => a.id);
    const repurposed =
      anchorIds.length > 0
        ? await db
            .select()
            .from(repurposedContent)
            .where(inArray(repurposedContent.anchorId, anchorIds))
            .orderBy(repurposedContent.createdAt)
        : [];

    // Manually combine the data
    const anchorsByCapsuleId = new Map<string, typeof anchors>();
    for (const anchorRecord of anchors) {
      if (!anchorsByCapsuleId.has(anchorRecord.capsuleId)) {
        anchorsByCapsuleId.set(anchorRecord.capsuleId, []);
      }
      anchorsByCapsuleId.get(anchorRecord.capsuleId)!.push(anchorRecord);
    }

    const repurposedByAnchorId = new Map<string, typeof repurposed>();
    for (const repurposedRecord of repurposed) {
      if (!repurposedByAnchorId.has(repurposedRecord.anchorId)) {
        repurposedByAnchorId.set(repurposedRecord.anchorId, []);
      }
      repurposedByAnchorId.get(repurposedRecord.anchorId)!.push(repurposedRecord);
    }

    // Combine anchors with repurposed content
    const capsulesWithAnchors = capsules.map((capsuleRecord) => ({
      ...capsuleRecord,
      anchors: (anchorsByCapsuleId.get(capsuleRecord.id) || []).map(
        (anchorRecord) => ({
          ...anchorRecord,
          repurposedContent:
            repurposedByAnchorId.get(anchorRecord.id) || [],
        }),
      ),
    }));

    return NextResponse.json(capsulesWithAnchors);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/capsules - Create capsule
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await parseJsonBody(request);
    const input = createCapsuleSchema.parse(body);

    const [newCapsule] = await db
      .insert(capsule)
      .values({
        title: input.title,
        promise: input.promise,
        cta: input.cta,
        offerMapping: input.offerMapping ?? null,
      })
      .returning();

    return NextResponse.json(newCapsule, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
