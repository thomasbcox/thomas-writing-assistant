/**
 * REST API routes for individual concepts
 * GET /api/concepts/[id] - Get concept by ID
 * PUT /api/concepts/[id] - Update concept
 * DELETE /api/concepts/[id] - Delete concept (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { logger } from "~/lib/logger";

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

    const concept = await db.concept.findUnique({
      where: { id },
      include: {
        outgoingLinks: {
          include: { target: true },
        },
        incomingLinks: {
          include: { source: true },
        },
      },
    });

    if (!concept) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    return NextResponse.json(concept);
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

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.creator !== undefined) updateData.creator = input.creator;
    if (input.source !== undefined) updateData.source = input.source;
    if (input.year !== undefined) updateData.year = input.year;

    const concept = await db.concept.update({
      where: { id },
      data: updateData,
    });

    logger.info({
      operation: "updateConcept",
      conceptId: id,
      updatedFields: Object.keys(updateData),
    }, "Updated concept");

    return NextResponse.json(concept);
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

    const concept = await db.concept.update({
      where: { id },
      data: {
        status: "trash",
        trashedAt: new Date(),
      },
    });

    logger.info({
      operation: "deleteConcept",
      conceptId: id,
      title: concept.title,
    }, "Soft deleted concept");

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

