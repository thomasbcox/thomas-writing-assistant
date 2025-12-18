/**
 * Admin API route to get database statistics
 * GET /api/admin/db-stats - Get record counts for all tables
 */

import { NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";

export async function GET() {
  try {
    const db = getDb();

    const [
      conceptCount,
      activeConceptCount,
      trashedConceptCount,
      linkCount,
      capsuleCount,
      anchorCount,
      repurposedContentCount,
      linkNameCount,
      mruConceptCount,
    ] = await Promise.all([
      db.concept.count(),
      db.concept.count({ where: { status: "active" } }),
      db.concept.count({ where: { status: "trash" } }),
      db.link.count(),
      db.capsule.count(),
      db.anchor.count(),
      db.repurposedContent.count(),
      db.linkName.count(),
      db.mRUConcept.count(),
    ]);

    // Get sample data for verification
    const sampleConcepts = await db.concept.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
        status: true,
        description: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const sampleCapsules = await db.capsule.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const sampleLinks = await db.link.findMany({
      take: 3,
      select: {
        id: true,
        forwardName: true,
        reverseName: true,
        source: { select: { title: true } },
        target: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      counts: {
        Concept: conceptCount,
        Link: linkCount,
        Capsule: capsuleCount,
        Anchor: anchorCount,
        RepurposedContent: repurposedContentCount,
        LinkName: linkNameCount,
        MRUConcept: mruConceptCount,
      },
      breakdowns: {
        concepts: {
          total: conceptCount,
          active: activeConceptCount,
          trashed: trashedConceptCount,
        },
      },
      samples: {
        concepts: sampleConcepts,
        capsules: sampleCapsules,
        links: sampleLinks,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
