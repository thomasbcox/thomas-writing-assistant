/**
 * REST API route to get available AI models
 * GET /api/ai/models
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "~/server/api/helpers";
import { getDependencies } from "~/server/dependencies";

export async function GET() {
  try {
    const { llmClient } = getDependencies();
    const provider = llmClient.getProvider();

    if (provider === "gemini") {
      return NextResponse.json({
        provider: "gemini",
        models: [
          { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview (Latest & Most Capable - Recommended)" },
          { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Fast & Cheap)" },
          { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Advanced)" },
          { value: "gemini-1.5-flash-002", label: "Gemini 1.5 Flash 002 (Stable)" },
          { value: "gemini-1.5-pro-002", label: "Gemini 1.5 Pro 002 (Stable)" },
          { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp (Experimental)" },
          { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash Latest (May not work)" },
          { value: "gemini-pro", label: "Gemini Pro (Legacy - may not work with v1beta)" },
        ],
      });
    } else {
      return NextResponse.json({
        provider: "openai",
        models: [
          { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Cheap)" },
          { value: "gpt-4o", label: "GPT-4o (Balanced)" },
          { value: "gpt-4-turbo", label: "GPT-4 Turbo (Advanced)" },
          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
        ],
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

