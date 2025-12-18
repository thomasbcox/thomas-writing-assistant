/**
 * REST API routes for style guide
 * GET /api/config/style-guide - Get parsed style guide
 * GET /api/config/style-guide/raw - Get raw YAML
 * PUT /api/config/style-guide - Update style guide
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseJsonBody } from "~/server/api/helpers";
import { getConfigLoader } from "~/server/services/config";
import { safeWriteConfigFile } from "~/server/api/config-helpers";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const updateStyleGuideSchema = z.object({
  content: z.string(),
});

// GET /api/config/style-guide - Get parsed style guide
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const isRaw = url.searchParams.get("raw") === "true";
    
    if (isRaw) {
      // Return raw YAML
      const configDir = path.join(process.cwd(), "config");
      const styleGuidePath = path.join(configDir, "style_guide.yaml");
      
      if (!fs.existsSync(styleGuidePath)) {
        return NextResponse.json({ error: "style_guide.yaml not found" }, { status: 404 });
      }

      const content = fs.readFileSync(styleGuidePath, "utf-8");
      return NextResponse.json({ content });
    }
    
    // Return parsed style guide
    const loader = getConfigLoader();
    return NextResponse.json(loader.getStyleGuide());
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/config/style-guide - Update style guide
export async function PUT(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const input = updateStyleGuideSchema.parse(body);
    const configDir = path.join(process.cwd(), "config");
    const styleGuidePath = path.join(configDir, "style_guide.yaml");

    // Safely write with validation and backup
    const result = safeWriteConfigFile(styleGuidePath, input.content, "style_guide.yaml");
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    // Reload configs immediately
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

