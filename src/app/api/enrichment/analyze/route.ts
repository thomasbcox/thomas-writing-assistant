/**
 * REST API route to analyze a concept
 * POST /api/enrichment/analyze
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getDependencies } from "~/server/dependencies";
import { analyzeConcept, type ConceptFormData } from "~/server/services/conceptEnricher";
import { logServiceError } from "~/lib/logger";

const analyzeSchema = z.object({
  title: z.string(),
  description: z.string(),
  content: z.string(),
  creator: z.string(),
  source: z.string(),
  year: z.string(),
});

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await parseJsonBody(request);
    const input = analyzeSchema.parse(body);
    
    const { llmClient, configLoader } = getDependencies();
    
    const result = await analyzeConcept(input as ConceptFormData, llmClient, configLoader);
    return NextResponse.json(result);
  } catch (error) {
    // Enhanced error logging for AI diagnosis
    logServiceError(error, "enrichment.analyze", {
      conceptTitle: body?.title || "unknown",
      hasTitle: !!body?.title,
      hasDescription: !!body?.description,
      hasContent: !!body?.content,
      inputKeys: body ? Object.keys(body) : [],
      errorPhase: "analyzeConcept",
    });
    return handleApiError(error);
  }
}

