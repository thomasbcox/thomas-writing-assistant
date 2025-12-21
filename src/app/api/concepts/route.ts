/**
 * REST API routes for concepts
 * GET /api/concepts - List concepts
 * POST /api/concepts - Create concept
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody, getQueryParamBool, getQueryParam } from "~/server/api/helpers";
import { logger } from "~/lib/logger";
import { eq, and, or, like, desc } from "drizzle-orm";
import { concept } from "~/server/schema";

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

    const conditions = [];

    if (!includeTrash) {
      conditions.push(eq(concept.status, "active"));
    }

    if (search) {
      conditions.push(
        or(
          like(concept.title, `%${search}%`),
          like(concept.description, `%${search}%`),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const concepts = await db
      .select()
      .from(concept)
      .where(whereClause)
      .orderBy(desc(concept.createdAt));

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

    const [newConcept] = await db
      .insert(concept)
      .values({
        identifier,
        title: input.title,
        description: input.description ?? "",
        content: input.content,
        creator: input.creator ?? "",
        source: input.source ?? "Unknown",
        year: input.year ?? new Date().getFullYear().toString(),
        status: "active",
      })
      .returning();

    logger.info({
      operation: "createConcept",
      conceptId: newConcept.id,
      identifier: newConcept.identifier,
      title: newConcept.title,
      creator: newConcept.creator,
      source: newConcept.source,
    }, "Created concept");

    return NextResponse.json(newConcept, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
