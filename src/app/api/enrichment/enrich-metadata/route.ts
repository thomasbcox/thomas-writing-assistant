/**
 * REST API route to enrich concept metadata
 * POST /api/enrichment/enrich-metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";
import { enrichMetadata } from "~/server/services/conceptEnricher";
import { logServiceError } from "~/lib/logger";

const enrichMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await parseJsonBody(request);
    const input = enrichMetadataSchema.parse(body);
    
    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();
    
    const result = await enrichMetadata(input.title, input.description, llmClient, configLoader);
    return NextResponse.json(result);
  } catch (error) {
    logServiceError(error, "enrichment.enrichMetadata", { conceptTitle: body?.title || "unknown" });
    return handleApiError(error);
  }
}

