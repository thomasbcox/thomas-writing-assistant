/**
 * REST API route to get config file status
 * GET /api/config/status
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "~/server/api/helpers";
import { getDependencies } from "~/server/dependencies";

export async function GET() {
  try {
    const { configLoader } = getDependencies();
    return NextResponse.json(configLoader.getConfigStatus());
  } catch (error) {
    return handleApiError(error);
  }
}

