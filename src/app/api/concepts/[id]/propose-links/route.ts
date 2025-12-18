/**
 * REST API route to propose links for a concept
 * GET /api/concepts/[id]/propose-links
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, getDb, getQueryParam } from "~/server/api/helpers";
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";
import { proposeLinksForConcept } from "~/server/services/linkProposer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDb();
    const { id: conceptId } = await params;
    const maxProposals = parseInt(getQueryParam(request, "maxProposals") || "5", 10);

    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();

    const proposals = await proposeLinksForConcept(
      conceptId,
      maxProposals,
      db,
      llmClient,
      configLoader,
    );

    return NextResponse.json(proposals);
  } catch (error) {
    return handleApiError(error);
  }
}

