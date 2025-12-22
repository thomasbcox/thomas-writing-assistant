/**
 * API endpoint to toggle between dev and prod databases
 * POST /api/database/toggle
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabasePreference, setDatabasePreference, type DatabasePreference } from "~/server/services/db-preference";
import { reconnectDatabase } from "~/server/db";

export async function GET() {
  try {
    const preference = getDatabasePreference();
    return NextResponse.json({ 
      database: preference,
      message: `Currently using ${preference === "prod" ? "production" : "development"} database`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get database preference" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { database } = body as { database?: DatabasePreference };
    
    if (!database || (database !== "dev" && database !== "prod")) {
      return NextResponse.json(
        { error: "Invalid database preference. Must be 'dev' or 'prod'" },
        { status: 400 }
      );
    }

    const currentPreference = getDatabasePreference();
    if (currentPreference === database) {
      return NextResponse.json({
        message: `Already using ${database === "prod" ? "production" : "development"} database`,
        database,
      });
    }

    // Set the new preference
    setDatabasePreference(database);

    // Attempt to reconnect to the new database
    try {
      await reconnectDatabase();
      return NextResponse.json({
        message: `Switched to ${database === "prod" ? "production" : "development"} database successfully`,
        database,
      });
    } catch (reconnectError) {
      // Preference was saved, but reconnection failed
      return NextResponse.json({
        message: `Database preference updated to ${database}, but reconnection failed. Server restart may be required.`,
        database,
        warning: reconnectError instanceof Error ? reconnectError.message : "Reconnection failed",
      }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle database" },
      { status: 500 }
    );
  }
}

