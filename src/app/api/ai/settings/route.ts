/**
 * REST API routes for AI settings
 * GET /api/ai/settings - Get AI settings
 * PUT /api/ai/settings - Update AI settings
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getDependencies } from "~/server/dependencies";
import { env } from "~/env";

const updateSettingsSchema = z.object({
  provider: z.enum(["openai", "gemini"]).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// GET /api/ai/settings - Get AI settings
export async function GET() {
  try {
    const { llmClient } = getDependencies();
    return NextResponse.json({
      provider: llmClient.getProvider(),
      model: llmClient.getModel(),
      temperature: llmClient.getTemperature(),
      availableProviders: {
        openai: !!env.OPENAI_API_KEY,
        gemini: !!env.GOOGLE_API_KEY,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/ai/settings - Update AI settings
export async function PUT(request: NextRequest) {
  try {
    const { llmClient } = getDependencies();
    const body = await parseJsonBody(request);
    const input = updateSettingsSchema.parse(body);

    if (input.provider) {
      llmClient.setProvider(input.provider);
    }

    if (input.model) {
      llmClient.setModel(input.model);
    }

    if (input.temperature !== undefined) {
      llmClient.setTemperature(input.temperature);
    }

    return NextResponse.json({
      provider: llmClient.getProvider(),
      model: llmClient.getModel(),
      temperature: llmClient.getTemperature(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

