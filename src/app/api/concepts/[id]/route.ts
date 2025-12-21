/**
 * REST API routes for individual concepts
 * GET /api/concepts/[id] - Get concept by ID
 * PUT /api/concepts/[id] - Update concept
 * DELETE /api/concepts/[id] - Delete concept (soft delete)
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { logger } from "~/lib/logger";
import { eq } from "drizzle-orm";
import { concept } from "~/server/schema";

const updateConceptSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().min(1).optional(),
  creator: z.string().optional(),
  source: z.string().optional(),
  year: z.string().optional(),
});

// GET /api/concepts/[id] - Get concept by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id } = await params;

    const foundConcept = await db.query.concept.findFirst({
      where: eq(concept.id, id),
      with: {
        outgoingLinks: {
          with: { target: true },
        },
        incomingLinks: {
          with: { source: true },
        },
      },
    });

    if (!foundConcept) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    return NextResponse.json(foundConcept);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/concepts/[id] - Update concept
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id } = await params;
    const body = await parseJsonBody(request);
    const input = updateConceptSchema.parse(body);

    const [updatedConcept] = await db
      .update(concept)
      .set(input)
      .where(eq(concept.id, id))
      .returning();

    if (!updatedConcept) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    logger.info({
      operation: "updateConcept",
      conceptId: id,
      updatedFields: Object.keys(input),
    }, "Updated concept");

    return NextResponse.json(updatedConcept);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/concepts/[id] - Delete concept (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id } = await params;

    const foundConcept = await db.query.concept.findFirst({
      where: eq(concept.id, id),
    });

    if (!foundConcept) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    const [deletedConcept] = await db
      .update(concept)
      .set({
        status: "trash",
        trashedAt: new Date(),
      })
      .where(eq(concept.id, id))
      .returning();

    logger.info({
      operation: "deleteConcept",
      conceptId: id,
      title: deletedConcept.title,
    }, "Soft deleted concept");

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
