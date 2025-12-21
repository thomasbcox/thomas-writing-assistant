/**
 * REST API routes for link names
 * GET /api/link-names - List all link names (deprecated - use tRPC)
 * POST /api/link-names - Create link name (deprecated - use tRPC)
 * Uses Drizzle ORM for database access
 * 
 * NOTE: This route is deprecated. Use tRPC linkName router instead.
 * Kept for backward compatibility.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, handleApiError, parseJsonBody } from "~/server/api/helpers";
import { eq, or } from "drizzle-orm";
import { linkName } from "~/server/schema";

const createLinkNameSchema = z.object({
  name: z.string().min(1).trim(),
});

// GET /api/link-names - List all link names (deprecated)
export async function GET() {
  try {
    const db = getDb();

    // This route is deprecated - use tRPC linkName.getAll instead
    // Return empty array for backward compatibility
    return NextResponse.json([]);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/link-names - Create link name (deprecated)
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await parseJsonBody(request);
    const input = createLinkNameSchema.parse(body);
    const trimmedName = input.name.trim();

    if (!trimmedName) {
      return NextResponse.json(
        { error: "Link name cannot be empty" },
        { status: 400 },
      );
    }

    // This route is deprecated - use tRPC linkName.create instead
    // Check if linkName exists by forwardName or reverseName
    const existing = await db.query.linkName.findFirst({
      where: (linkNames, { or }) =>
        or(
          eq(linkNames.forwardName, trimmedName),
          eq(linkNames.reverseName, trimmedName),
        )!,
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // For backward compatibility, create a symmetric link name pair
    const [newLinkName] = await db
      .insert(linkName)
      .values({
        forwardName: trimmedName,
        reverseName: trimmedName,
        isSymmetric: true,
        isDefault: false,
      })
      .returning();

    return NextResponse.json(newLinkName, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
