/**
 * Admin API route to get database statistics
 * GET /api/admin/db-stats - Get record counts for all tables
 * Uses Drizzle ORM for database access
 */

import { NextResponse } from "next/server";
import { getDb, handleApiError } from "~/server/api/helpers";
import { eq, desc } from "drizzle-orm";
import { concept, link, capsule, anchor, repurposedContent, linkName, mruConcept } from "~/server/schema";

export async function GET() {
  try {
    const db = getDb();

    const [
      allConcepts,
      activeConcepts,
      trashedConcepts,
      allLinks,
      allCapsules,
      allAnchors,
      allRepurposed,
      allLinkNames,
      allMRU,
    ] = await Promise.all([
      db.select().from(concept),
      db.select().from(concept).where(eq(concept.status, "active")),
      db.select().from(concept).where(eq(concept.status, "trash")),
      db.select().from(link),
      db.select().from(capsule),
      db.select().from(anchor),
      db.select().from(repurposedContent),
      db.select().from(linkName),
      db.select().from(mruConcept),
    ]);

    // Get sample data for verification
    const sampleConcepts = await db
      .select({
        id: concept.id,
        title: concept.title,
        status: concept.status,
        description: concept.description,
      })
      .from(concept)
      .orderBy(desc(concept.createdAt))
      .limit(3);

    const sampleCapsules = await db
      .select({
        id: capsule.id,
        title: capsule.title,
      })
      .from(capsule)
      .orderBy(desc(capsule.createdAt))
      .limit(3);

    // Get sample links with source and target concept titles
    const sampleLinksRaw = await (db.query as any).link.findMany({
      limit: 3,
      orderBy: [desc(link.createdAt)],
      with: {
        source: true,
        target: true,
        linkName: true,
      },
    });
    
    const sampleLinks = sampleLinksRaw.map((l: { id: string; linkName?: { forwardName: string; reverseName: string } | null; source?: { title: string } | null; target?: { title: string } | null }) => ({
      id: l.id,
      linkName: l.linkName ? {
        forwardName: l.linkName.forwardName,
        reverseName: l.linkName.reverseName,
      } : null,
      source: { title: l.source?.title || "" },
      target: { title: l.target?.title || "" },
    }));

    return NextResponse.json({
      counts: {
        Concept: allConcepts.length,
        Link: allLinks.length,
        Capsule: allCapsules.length,
        Anchor: allAnchors.length,
        RepurposedContent: allRepurposed.length,
        LinkName: allLinkNames.length,
        MRUConcept: allMRU.length,
      },
      breakdowns: {
        concepts: {
          total: allConcepts.length,
          active: activeConcepts.length,
          trashed: trashedConcepts.length,
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
