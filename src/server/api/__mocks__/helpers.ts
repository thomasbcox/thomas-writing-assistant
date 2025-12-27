/**
 * Manual mock for ~/server/api/helpers
 * Jest will use this when jest.mock("~/server/api/helpers") is called
 */

import { jest } from "@jest/globals";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

// This will be set by tests
let testDb: any = null;

export function setTestDb(db: any) {
  testDb = db;
}

export function getDb() {
  if (!testDb) {
    throw new Error("Test database not set. Call setTestDb() in beforeAll.");
  }
  return testDb;
}

// Re-export actual implementations for other functions
export async function handleApiError(error: unknown): Promise<NextResponse> {
  const actual = await import("../helpers");
  return actual.handleApiError(error);
}

export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  const actual = await import("../helpers");
  return actual.parseJsonBody<T>(request);
}

export function getQueryParam(request: NextRequest, key: string): string | undefined {
  const { searchParams } = new URL(request.url);
  return searchParams.get(key) ?? undefined;
}

export function getQueryParamBool(request: NextRequest, key: string, defaultValue = false): boolean {
  const value = getQueryParam(request, key);
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}
