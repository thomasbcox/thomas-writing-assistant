import { ipcMain } from "electron";
import { getConfigLoader } from "../../src/server/services/config.js";
import { app } from "electron";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

export function registerConfigHandlers() {
  // Get style guide
  ipcMain.handle("config:getStyleGuide", async () => {
    const loader = getConfigLoader();
    return loader.getStyleGuide();
  });

  // Get credo
  ipcMain.handle("config:getCredo", async () => {
    const loader = getConfigLoader();
    return loader.getCredo();
  });

  // Get constraints
  ipcMain.handle("config:getConstraints", async () => {
    const loader = getConfigLoader();
    return loader.getConstraints();
  });

  // Get style guide raw
  ipcMain.handle("config:getStyleGuideRaw", async () => {
    const configDir = join(app.getPath("userData"), "config");
    const styleGuidePath = join(configDir, "style_guide.yaml");
    
    // Fallback to project config if user config doesn't exist
    const projectConfigPath = join(process.cwd(), "config", "style_guide.yaml");
    const finalPath = existsSync(styleGuidePath) ? styleGuidePath : projectConfigPath;
    
    if (!existsSync(finalPath)) {
      throw new Error("style_guide.yaml not found");
    }

    const content = readFileSync(finalPath, "utf-8");
    return { content };
  });

  // Get credo raw
  ipcMain.handle("config:getCredoRaw", async () => {
    const configDir = join(app.getPath("userData"), "config");
    const credoPath = join(configDir, "credo.yaml");
    
    const projectConfigPath = join(process.cwd(), "config", "credo.yaml");
    const finalPath = existsSync(credoPath) ? credoPath : projectConfigPath;
    
    if (!existsSync(finalPath)) {
      throw new Error("credo.yaml not found");
    }

    const content = readFileSync(finalPath, "utf-8");
    return { content };
  });

  // Get constraints raw
  ipcMain.handle("config:getConstraintsRaw", async () => {
    const configDir = join(app.getPath("userData"), "config");
    const constraintsPath = join(configDir, "constraints.yaml");
    
    const projectConfigPath = join(process.cwd(), "config", "constraints.yaml");
    const finalPath = existsSync(constraintsPath) ? constraintsPath : projectConfigPath;
    
    if (!existsSync(finalPath)) {
      throw new Error("constraints.yaml not found");
    }

    const content = readFileSync(finalPath, "utf-8");
    return { content };
  });

  // Update style guide
  ipcMain.handle("config:updateStyleGuide", async (_event, input: unknown) => {
    const { z } = await import("zod");
    const parsed = z.object({ content: z.string() }).parse(input);
    const { writeFileSync, mkdirSync, existsSync } = await import("fs");
    
    const configDir = join(app.getPath("userData"), "config");
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    const styleGuidePath = join(configDir, "style_guide.yaml");
    writeFileSync(styleGuidePath, parsed.content, "utf-8");
    
    return { success: true };
  });

  // Update credo
  ipcMain.handle("config:updateCredo", async (_event, input: unknown) => {
    const { z } = await import("zod");
    const parsed = z.object({ content: z.string() }).parse(input);
    const { writeFileSync, mkdirSync, existsSync } = await import("fs");
    
    const configDir = join(app.getPath("userData"), "config");
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    const credoPath = join(configDir, "credo.yaml");
    writeFileSync(credoPath, parsed.content, "utf-8");
    
    return { success: true };
  });

  // Update constraints
  ipcMain.handle("config:updateConstraints", async (_event, input: unknown) => {
    const { z } = await import("zod");
    const parsed = z.object({ content: z.string() }).parse(input);
    const { writeFileSync, mkdirSync, existsSync } = await import("fs");
    
    const configDir = join(app.getPath("userData"), "config");
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    const constraintsPath = join(configDir, "constraints.yaml");
    writeFileSync(constraintsPath, parsed.content, "utf-8");
    
    return { success: true };
  });

  // Get config status
  ipcMain.handle("config:getStatus", async () => {
    const { existsSync } = await import("fs");
    const configDir = join(app.getPath("userData"), "config");
    
    return {
      styleGuide: existsSync(join(configDir, "style_guide.yaml")),
      credo: existsSync(join(configDir, "credo.yaml")),
      constraints: existsSync(join(configDir, "constraints.yaml")),
    };
  });
}

