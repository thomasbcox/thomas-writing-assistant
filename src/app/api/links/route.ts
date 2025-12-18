/**
 * REST API routes for links
 * GET /api/links - Get links (query param: conceptId)
 * POST /api/links - Create link
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody, getQueryParam } from "~/server/api/helpers";

const createLinkSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  forwardName: z.string().min(1),
  reverseName: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/links - Get links
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const conceptId = getQueryParam(request, "conceptId");

    if (conceptId) {
      // Get links for a specific concept
      const outgoing = await db.link.findMany({
        where: { sourceId: conceptId },
        include: { 
          target: true,
          source: true,
        },
      });

      const incoming = await db.link.findMany({
        where: { targetId: conceptId },
        include: { 
          source: true,
          target: true,
        },
      });

      return NextResponse.json({ outgoing, incoming });
    }

    // Get all links
    const links = await db.link.findMany({
      include: {
        source: true,
        target: true,
      },
      orderBy: { createdAt: "desc" },
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

    // Check if link already exists
    const existing = await db.link.findUnique({
      where: {
        sourceId_targetId: {
          sourceId: input.sourceId,
          targetId: input.targetId,
        },
      },
    });

    let link;
    if (existing) {
      // Update existing link
      link = await db.link.update({
        where: { id: existing.id },
        data: {
          forwardName: input.forwardName,
          reverseName: input.reverseName ?? input.forwardName,
          notes: input.notes,
        },
        include: {
          source: true,
          target: true,
        },
      });
    } else {
      // Create new link
      link = await db.link.create({
        data: {
          sourceId: input.sourceId,
          targetId: input.targetId,
          forwardName: input.forwardName,
          reverseName: input.reverseName ?? input.forwardName,
          notes: input.notes,
        },
        include: {
          source: true,
          target: true,
        },
      });

      // Auto-add link names if they don't exist
      const linkNames = await db.linkName.findMany();
      const existingNames = new Set(linkNames.map((ln: { name: string }) => ln.name));

      if (!existingNames.has(input.forwardName)) {
        await db.linkName.create({
          data: {
            name: input.forwardName,
            isDefault: false,
          },
        });
      }

      if (input.reverseName && !existingNames.has(input.reverseName)) {
        await db.linkName.create({
          data: {
            name: input.reverseName,
            isDefault: false,
          },
        });
      }
    }

    return NextResponse.json(link, { status: existing ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

