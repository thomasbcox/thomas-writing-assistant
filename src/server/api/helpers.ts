/**
 * Helper functions for REST API routes
 */

import { db } from "~/server/db";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { logServiceError } from "~/lib/logger";

/**
 * Get database instance for API routes
 */
export function getDb(): typeof db {
  return db;
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation error",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    // Log the error for debugging
    logServiceError(error, "API route");
    
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: "Internal server error",
    },
    { status: 500 },
  );
}

/**
 * Parse JSON body from request
 */
export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
}

/**
 * Get query parameter from request
 */
export function getQueryParam(request: NextRequest, key: string): string | undefined {
  const { searchParams } = new URL(request.url);
  return searchParams.get(key) ?? undefined;
}

/**
 * Get query parameter as boolean
 */
export function getQueryParamBool(request: NextRequest, key: string, defaultValue = false): boolean {
  const value = getQueryParam(request, key);
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

