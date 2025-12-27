/**
 * REST API route for blog post generation
 * POST /api/blog-posts/generate - Generate a blog post from concepts
 * Uses Drizzle ORM for database access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getDependencies } from "~/server/dependencies";
import { generateBlogPost } from "~/server/services/blogPostGenerator";
import type { ConceptReference } from "~/server/services/blogPostGenerator";
import { eq, and, inArray } from "drizzle-orm";
import { concept } from "~/server/schema";

const generateBlogPostSchema = z.object({
  title: z.string().optional(),
  topic: z.string().min(1, "Topic is required"),
  conceptIds: z.array(z.string()).min(1, "At least one concept is required"),
  targetLength: z.enum(["short", "medium", "long"]).optional(),
  tone: z.enum(["informative", "conversational", "authoritative", "personal"]).optional(),
  includeCTA: z.boolean().optional(),
  ctaText: z.string().optional(),
});

// POST /api/blog-posts/generate - Generate blog post
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await parseJsonBody(request);
    const input = generateBlogPostSchema.parse(body);

    // Fetch the concepts
    const concepts = await db
      .select({
        id: concept.id,
        title: concept.title,
        description: concept.description,
        content: concept.content,
        creator: concept.creator,
        source: concept.source,
      })
      .from(concept)
      .where(
        and(
          inArray(concept.id, input.conceptIds),
          eq(concept.status, "active"),
        )!,
      );

    if (concepts.length === 0) {
      return NextResponse.json(
        { error: "No valid concepts found with the provided IDs" },
        { status: 404 },
      );
    }

    if (concepts.length !== input.conceptIds.length) {
      // Some concepts were not found, but we'll proceed with what we have
      const foundIds = concepts.map((c) => c.id);
      const missingIds = input.conceptIds.filter((id) => !foundIds.includes(id));
      console.warn(`Some concepts not found: ${missingIds.join(", ")}`);
    }

    // Map to ConceptReference format
    const conceptReferences: ConceptReference[] = concepts.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description ?? "",
      content: c.content ?? "",
      creator: c.creator ?? undefined,
      source: c.source ?? undefined,
    }));

    // Generate the blog post
    const { llmClient, configLoader } = getDependencies();
    const blogPost = await generateBlogPost(
      input,
      conceptReferences,
      llmClient,
      configLoader,
    );

    return NextResponse.json(blogPost);
  } catch (error) {
    return handleApiError(error);
  }
}
