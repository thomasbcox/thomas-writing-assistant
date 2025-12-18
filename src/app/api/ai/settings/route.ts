/**
 * REST API routes for AI settings
 * GET /api/ai/settings - Get AI settings
 * PUT /api/ai/settings - Update AI settings
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getLLMClient } from "~/server/services/llm/client";
import { env } from "~/env";

const updateSettingsSchema = z.object({
  provider: z.enum(["openai", "gemini"]).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// GET /api/ai/settings - Get AI settings
export async function GET() {
  try {
    const client = getLLMClient();
    return NextResponse.json({
      provider: client.getProvider(),
      model: client.getModel(),
      temperature: client.getTemperature(),
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
    const client = getLLMClient();
    const body = await parseJsonBody(request);
    const input = updateSettingsSchema.parse(body);

    if (input.provider) {
      client.setProvider(input.provider);
    }

    if (input.model) {
      client.setModel(input.model);
    }

    if (input.temperature !== undefined) {
      client.setTemperature(input.temperature);
    }

    return NextResponse.json({
      provider: client.getProvider(),
      model: client.getModel(),
      temperature: client.getTemperature(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

