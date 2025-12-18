/**
 * REST API routes for capsules
 * GET /api/capsules - List all capsules
 * POST /api/capsules - Create capsule
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";

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
    
    // Fetch capsules first
    const capsules = await db.capsule.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (capsules.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch all anchors for these capsules
    const capsuleIds = capsules.map((c) => c.id);
    const anchors = await db.anchor.findMany({
      where: { capsuleId: { in: capsuleIds } },
      orderBy: { createdAt: "asc" },
    });

    // Fetch all repurposed content for these anchors
    const anchorIds = anchors.map((a) => a.id);
    const repurposedContent = anchorIds.length > 0
      ? await db.repurposedContent.findMany({
          where: { anchorId: { in: anchorIds } },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            anchorId: true,
            type: true,
            content: true,
            guidance: true,
            createdAt: true,
          },
        })
      : [];

    // Manually combine the data
    const anchorsByCapsuleId = new Map<string, typeof anchors>();
    for (const anchor of anchors) {
      if (!anchorsByCapsuleId.has(anchor.capsuleId)) {
        anchorsByCapsuleId.set(anchor.capsuleId, []);
      }
      anchorsByCapsuleId.get(anchor.capsuleId)!.push(anchor);
    }

    const repurposedByAnchorId = new Map<string, typeof repurposedContent>();
    for (const repurposed of repurposedContent) {
      if (!repurposedByAnchorId.has(repurposed.anchorId)) {
        repurposedByAnchorId.set(repurposed.anchorId, []);
      }
      repurposedByAnchorId.get(repurposed.anchorId)!.push(repurposed);
    }

    // Combine anchors with repurposed content
    const capsulesWithAnchors = capsules.map((capsule) => ({
      ...capsule,
      anchors: (anchorsByCapsuleId.get(capsule.id) || []).map((anchor) => ({
        ...anchor,
        repurposedContent: repurposedByAnchorId.get(anchor.id) || [],
      })),
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

    const capsule = await db.capsule.create({
      data: {
        title: input.title,
        promise: input.promise,
        cta: input.cta,
        offerMapping: input.offerMapping,
      },
    });

    return NextResponse.json(capsule, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

