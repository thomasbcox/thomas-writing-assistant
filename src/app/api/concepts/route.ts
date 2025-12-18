/**
 * REST API routes for concepts
 * GET /api/concepts - List concepts
 * POST /api/concepts - Create concept
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody, getQueryParamBool, getQueryParam } from "~/server/api/helpers";
import { logger } from "~/lib/logger";

const createConceptSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  content: z.string().min(1),
  creator: z.string().optional().default(""),
  source: z.string().optional().default("Unknown"),
  year: z.string().optional(),
});

// GET /api/concepts - List concepts
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const includeTrash = getQueryParamBool(request, "includeTrash", false);
    const search = getQueryParam(request, "search");

    const where: {
      status?: string;
      OR?: Array<{ title?: { contains: string } } | { description?: { contains: string } }>;
    } = {};

    if (!includeTrash) {
      where.status = "active";
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const concepts = await db.concept.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    logger.info({
      operation: "listConcepts",
      count: concepts.length,
      includeTrash,
      hasSearch: !!search,
    }, "Listed concepts");

    return NextResponse.json(concepts);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/concepts - Create concept
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await parseJsonBody(request);
    const input = createConceptSchema.parse(body);
    const { v4: uuidv4 } = await import("uuid");
    const identifier = `zettel-${uuidv4().slice(0, 8)}`;

    const concept = await db.concept.create({
      data: {
        identifier,
        title: input.title,
        description: input.description ?? "",
        content: input.content,
        creator: input.creator ?? "",
        source: input.source ?? "Unknown",
        year: input.year ?? new Date().getFullYear().toString(),
        status: "active",
      },
    });

    logger.info({
      operation: "createConcept",
      conceptId: concept.id,
      identifier: concept.identifier,
      title: concept.title,
      creator: concept.creator,
      source: concept.source,
    }, "Created concept");

    return NextResponse.json(concept, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

