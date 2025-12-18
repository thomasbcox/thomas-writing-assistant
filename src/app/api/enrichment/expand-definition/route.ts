/**
 * REST API route to expand a definition
 * POST /api/enrichment/expand-definition
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";
import { expandDefinition } from "~/server/services/conceptEnricher";
import { logServiceError } from "~/lib/logger";

const expandDefinitionSchema = z.object({
  currentDefinition: z.string(),
  conceptTitle: z.string(),
});

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await parseJsonBody(request);
    const input = expandDefinitionSchema.parse(body);
    
    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();
    
    const expanded = await expandDefinition(
      input.currentDefinition,
      input.conceptTitle,
      llmClient,
      configLoader,
    );
    
    return NextResponse.json({ expanded });
  } catch (error) {
    logServiceError(error, "enrichment.expandDefinition", { conceptTitle: body?.conceptTitle || "unknown" });
    return handleApiError(error);
  }
}

