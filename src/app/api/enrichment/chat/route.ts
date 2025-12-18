/**
 * REST API route for conversational enrichment
 * POST /api/enrichment/chat
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getLLMClient } from "~/server/services/llm/client";
import { getConfigLoader } from "~/server/services/config";
import { chatEnrichConcept, type ConceptFormData, type ChatMessage } from "~/server/services/conceptEnricher";
import { logServiceError } from "~/lib/logger";

const chatSchema = z.object({
  message: z.string(),
  conceptData: z.object({
    title: z.string(),
    description: z.string(),
    content: z.string(),
    creator: z.string(),
    source: z.string(),
    year: z.string(),
  }),
  chatHistory: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    timestamp: z.union([z.date(), z.string()]),
    suggestions: z.array(z.any()).optional(),
    actions: z.array(z.any()).optional(),
  })),
});

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await parseJsonBody(request);
    const input = chatSchema.parse(body);
    
    const llmClient = getLLMClient();
    const configLoader = getConfigLoader();
    
    const history: ChatMessage[] = input.chatHistory.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
    }));
    
    const result = await chatEnrichConcept(
      input.message,
      input.conceptData as ConceptFormData,
      history,
      llmClient,
      configLoader,
    );
    
    return NextResponse.json(result);
  } catch (error) {
    logServiceError(error, "enrichment.chat", { conceptTitle: body?.conceptData?.title || "unknown" });
    return handleApiError(error);
  }
}

