/**
 * Helper functions for REST API routes
 */

import { getCurrentDb } from "~/server/db";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { logServiceError } from "~/lib/logger";

/**
 * Get database instance for API routes
 * This function always returns the current database instance, even after reconnection
 * 
 * IMPORTANT: After reconnectDatabase() is called, this will return the new database instance
 * because it uses getCurrentDb() which checks the global state first
 */
export function getDb() {
  return getCurrentDb();
}

/**
 * Handle API errors consistently
 * Enhanced logging for AI-first diagnosis
 */
export function handleApiError(error: unknown): NextResponse {
  // Log full error context for AI diagnosis
  const errorContext = {
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof ZodError) {
    logServiceError(error, "API route.validation", {
      ...errorContext,
      validationErrors: error.flatten(),
      fieldErrors: error.flatten().fieldErrors,
      formErrors: error.flatten().formErrors,
    });
    
    return NextResponse.json(
      {
        error: "Validation error",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    // Log the error with full context for AI diagnosis
    logServiceError(error, "API route", {
      ...errorContext,
      // Include additional context that might help diagnose
      errorName: error.name,
      errorCause: (error as any).cause,
    });
    
    return NextResponse.json(
      {
        error: error.message,
        // Include error type in response for better debugging
        errorType: error.constructor.name,
      },
      { status: 500 },
    );
  }

  // Unknown error type
  logServiceError(error, "API route.unknown", errorContext);
  
  return NextResponse.json(
    {
      error: "Internal server error",
      errorType: "UnknownError",
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

