/**
 * REST API route to generate concept candidates from text
 * POST /api/concepts/generate-candidates
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";

const generateCandidatesSchema = z.object({
  text: z.string().min(1),
  instructions: z.string().optional(),
  maxCandidates: z.number().default(5),
  defaultCreator: z.string().optional(),
  defaultYear: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const input = generateCandidatesSchema.parse(body);
    
    const { generateConceptCandidates } = await import(
      "~/server/services/conceptProposer"
    );
    const { llmClient, configLoader } = getDependencies();
    
    const candidates = await generateConceptCandidates(
      input.text,
      input.instructions,
      input.maxCandidates,
      input.defaultCreator,
      input.defaultYear,
      llmClient,
      configLoader,
    );

    // If no candidates were generated, provide helpful error message
    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error: "No concepts were generated. Possible reasons:\n\n" +
            "• The text may not contain extractable concepts (tips/advice rather than frameworks/models)\n" +
            "• The LLM couldn't find concepts meeting the strict criteria (must be named models/frameworks)\n" +
            "• The text may be too short or lack clear conceptual structure\n\n" +
            "Suggestions:\n" +
            "• Try text with clear frameworks, mental models, or named methodologies\n" +
            "• Increase maxCandidates (try 8-10)\n" +
            "• Add specific instructions about what types of concepts to extract\n" +
            "• Try a different section of the document",
          candidates: [],
        },
        { status: 200 } // Return 200 so UI can show the error message
      );
    }

    return NextResponse.json(candidates);
  } catch (error) {
    return handleApiError(error);
  }
}

