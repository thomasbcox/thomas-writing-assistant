/**
 * REST API route to expand a definition
 * POST /api/enrichment/expand-definition
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getDependencies } from "~/server/dependencies";
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
    
    const { llmClient, configLoader } = getDependencies();
    
    const expanded = await expandDefinition(
      input.currentDefinition,
      input.conceptTitle,
      llmClient,
      configLoader,
    );
    
    return NextResponse.json({ expanded });
  } catch (error) {
    // Enhanced error logging for AI diagnosis
    logServiceError(error, "enrichment.expandDefinition", {
      conceptTitle: body?.conceptTitle || "unknown",
      hasCurrentDefinition: !!body?.currentDefinition,
      currentDefinitionLength: body?.currentDefinition?.length || 0,
      errorPhase: "expandDefinition",
    });
    return handleApiError(error);
  }
}

