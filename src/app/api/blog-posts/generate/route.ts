/**
 * REST API route for blog post generation
 * POST /api/blog-posts/generate - Generate a blog post from concepts
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { generateBlogPost } from "~/server/services/blogPostGenerator";
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";
import type { ConceptReference } from "~/server/services/blogPostGenerator";

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
    const concepts = await db.concept.findMany({
      where: {
        id: { in: input.conceptIds },
        status: "active", // Only use active concepts
      },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        creator: true,
        source: true,
      },
    });

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
    const conceptReferences: ConceptReference[] = concepts.map((concept) => ({
      id: concept.id,
      title: concept.title,
      description: concept.description ?? "",
      content: concept.content ?? "",
      creator: concept.creator ?? undefined,
      source: concept.source ?? undefined,
    }));

    // Generate the blog post
    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();
    const blogPost = await generateBlogPost(input, conceptReferences, llmClient, configLoader);

    return NextResponse.json(blogPost);
  } catch (error) {
    return handleApiError(error);
  }
}
