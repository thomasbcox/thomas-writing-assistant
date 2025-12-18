/**
 * REST API routes for credo
 * GET /api/config/credo - Get parsed credo
 * GET /api/config/credo?raw=true - Get raw YAML
 * PUT /api/config/credo - Update credo
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getConfigLoader } from "~/server/services/config";
import { safeWriteConfigFile } from "~/server/api/config-helpers";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const updateCredoSchema = z.object({
  content: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const isRaw = url.searchParams.get("raw") === "true";
    
    if (isRaw) {
      const configDir = path.join(process.cwd(), "config");
      const credoPath = path.join(configDir, "credo.yaml");
      
      if (!fs.existsSync(credoPath)) {
        return NextResponse.json({ error: "credo.yaml not found" }, { status: 404 });
      }

      const content = fs.readFileSync(credoPath, "utf-8");
      return NextResponse.json({ content });
    }
    
    const loader = getConfigLoader();
    return NextResponse.json(loader.getCredo());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const input = updateCredoSchema.parse(body);
    const configDir = path.join(process.cwd(), "config");
    const credoPath = path.join(configDir, "credo.yaml");

    // Safely write with validation and backup
    const result = safeWriteConfigFile(credoPath, input.content, "credo.yaml");
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    const loader = getConfigLoader();
    loader.reloadConfigs();
    
    return NextResponse.json({ 
      success: true,
      backupPath: result.backupPath,
      message: result.backupPath ? "Configuration updated. Backup created." : "Configuration updated."
    });
  } catch (error) {
    return handleApiError(error);
  }
}

