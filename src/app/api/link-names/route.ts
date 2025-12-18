/**
 * REST API routes for link names
 * GET /api/link-names - List all link names
 * POST /api/link-names - Create link name
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";

const DEFAULT_LINK_NAMES = [
  "belongs to",
  "references",
  "is a subset of",
  "builds on",
  "contradicts",
  "related to",
  "example of",
  "prerequisite for",
  "extends",
  "similar to",
  "part of",
  "contains",
  "inspired by",
  "opposes",
];

const createLinkNameSchema = z.object({
  name: z.string().min(1).trim(),
});

// GET /api/link-names - List all link names
export async function GET() {
  try {
    const db = getDb();
    
    const customNames = await db.linkName.findMany({
      where: {
        isDefault: false,
        isDeleted: false,
      },
    });

    const deletedDefaults = await db.linkName.findMany({
      where: {
        isDefault: true,
        isDeleted: true,
      },
    });

    const deletedSet = new Set(deletedDefaults.map((ln: { name: string }) => ln.name));
    const availableDefaults = DEFAULT_LINK_NAMES.filter((name) => !deletedSet.has(name));
    const allNames = [...availableDefaults, ...customNames.map((ln) => ln.name)].sort();

    return NextResponse.json(allNames);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/link-names - Create link name
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await parseJsonBody(request);
    const input = createLinkNameSchema.parse(body);
    const trimmedName = input.name.trim();

    if (!trimmedName) {
      return NextResponse.json({ error: "Link name cannot be empty" }, { status: 400 });
    }

    const existing = await db.linkName.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const linkName = await db.linkName.create({
      data: {
        name: trimmedName,
        isDefault: false,
      },
    });

    return NextResponse.json(linkName, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

