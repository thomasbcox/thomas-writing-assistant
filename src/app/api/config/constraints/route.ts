/**
 * REST API routes for constraints
 * GET /api/config/constraints - Get parsed constraints
 * GET /api/config/constraints?raw=true - Get raw YAML
 * PUT /api/config/constraints - Update constraints
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getConfigLoader } from "~/server/services/config";
import { safeWriteConfigFile } from "~/server/api/config-helpers";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const updateConstraintsSchema = z.object({
  content: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const isRaw = url.searchParams.get("raw") === "true";
    
    if (isRaw) {
      const configDir = path.join(process.cwd(), "config");
      const constraintsPath = path.join(configDir, "constraints.yaml");
      
      if (!fs.existsSync(constraintsPath)) {
        return NextResponse.json({ error: "constraints.yaml not found" }, { status: 404 });
      }

      const content = fs.readFileSync(constraintsPath, "utf-8");
      return NextResponse.json({ content });
    }
    
    const loader = getConfigLoader();
    return NextResponse.json(loader.getConstraints());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const input = updateConstraintsSchema.parse(body);
    const configDir = path.join(process.cwd(), "config");
    const constraintsPath = path.join(configDir, "constraints.yaml");

    // Safely write with validation and backup
    const result = safeWriteConfigFile(constraintsPath, input.content, "constraints.yaml");
    
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

