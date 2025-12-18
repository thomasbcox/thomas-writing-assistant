/**
 * REST API route to get config file status
 * GET /api/config/status
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "~/server/api/helpers";
import { getConfigLoader } from "~/server/services/config";

export async function GET() {
  try {
    const loader = getConfigLoader();
    return NextResponse.json(loader.getConfigStatus());
  } catch (error) {
    return handleApiError(error);
  }
}

