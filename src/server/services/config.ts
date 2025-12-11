import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { logger } from "~/lib/logger";

export interface StyleGuide {
  voice?: Record<string, unknown>;
  writing_style?: Record<string, unknown>;
  vocabulary?: Record<string, unknown>;
  signature_techniques?: Record<string, unknown>;
  structure_preferences?: Record<string, unknown>;
  audience_engagement?: Record<string, unknown>;
  content_approach?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Credo {
  core_beliefs?: string[];
  content_philosophy?: Record<string, unknown>;
  ethical_guidelines?: Record<string, unknown>;
  topics_to_emphasize?: string[];
  topics_to_avoid?: string[];
  [key: string]: unknown;
}

export interface Constraints {
  content_constraints?: Record<string, unknown>;
  formatting_rules?: Record<string, unknown>;
  never_do?: string[];
  always_do?: string[];
  brand_consistency?: Record<string, unknown>;
  [key: string]: unknown;
}

export class ConfigLoader {
  private styleGuide: StyleGuide = {};
  private credo: Credo = {};
  private constraints: Constraints = {};

  constructor() {
    this.loadConfigs();
  }

  /**
   * Reload all config files from disk
   * Call this after updating config files to get immediate changes
   */
  reloadConfigs(): void {
    this.loadConfigs();
    logger.info({}, "Config files reloaded");
  }

  private loadConfigs() {
    const configDir = path.join(process.cwd(), "config");

    try {
      // Load style guide
      const styleGuidePath = path.join(configDir, "style_guide.yaml");
      if (fs.existsSync(styleGuidePath)) {
        const content = fs.readFileSync(styleGuidePath, "utf-8");
        this.styleGuide = (yaml.load(content) as StyleGuide) ?? {};
      }
    } catch (error) {
      logger.warn({ err: error, configFile: "style_guide.yaml" }, "Failed to load config file");
    }

    try {
      // Load credo
      const credoPath = path.join(configDir, "credo.yaml");
      if (fs.existsSync(credoPath)) {
        const content = fs.readFileSync(credoPath, "utf-8");
        this.credo = (yaml.load(content) as Credo) ?? {};
      }
    } catch (error) {
      logger.warn({ err: error, configFile: "credo.yaml" }, "Failed to load config file");
    }

    try {
      // Load constraints
      const constraintsPath = path.join(configDir, "constraints.yaml");
      if (fs.existsSync(constraintsPath)) {
        const content = fs.readFileSync(constraintsPath, "utf-8");
        this.constraints = (yaml.load(content) as Constraints) ?? {};
      }
    } catch (error) {
      logger.warn({ err: error, configFile: "constraints.yaml" }, "Failed to load config file");
    }
  }

  getStyleGuide(): StyleGuide {
    return this.styleGuide;
  }

  getCredo(): Credo {
    return this.credo;
  }

  getConstraints(): Constraints {
    return this.constraints;
  }

  getSystemPrompt(context?: string): string {
    let prompt = "";

    // Build style guide section
    if (Object.keys(this.styleGuide).length > 0) {
      prompt += "Writing Style Guide:\n";
      const styleGuideYaml = yaml.dump(this.styleGuide, { indent: 2 });
      prompt += styleGuideYaml;
      prompt += "\n";
    }

    // Build credo section
    if (Object.keys(this.credo).length > 0) {
      prompt += "Core Beliefs and Values:\n";
      const credoYaml = yaml.dump(this.credo, { indent: 2 });
      prompt += credoYaml;
      prompt += "\n";
    }

    // Build constraints section
    if (Object.keys(this.constraints).length > 0) {
      prompt += "Content Constraints and Rules:\n";
      const constraintsYaml = yaml.dump(this.constraints, { indent: 2 });
      prompt += constraintsYaml;
      prompt += "\n";
    }

    if (context) {
      prompt += `Context: ${context}\n\n`;
    }

    return prompt;
  }

  /**
   * Get status of all config files
   * Returns whether each config is loaded (not empty)
   */
  getConfigStatus(): {
    styleGuide: { loaded: boolean; isEmpty: boolean };
    credo: { loaded: boolean; isEmpty: boolean };
    constraints: { loaded: boolean; isEmpty: boolean };
  } {
    const configDir = path.join(process.cwd(), "config");
    
    const checkConfig = (filePath: string, config: Record<string, unknown>) => {
      const exists = fs.existsSync(filePath);
      const isEmpty = Object.keys(config).length === 0;
      return {
        loaded: exists && !isEmpty,
        isEmpty: !exists || isEmpty,
      };
    };

    return {
      styleGuide: checkConfig(
        path.join(configDir, "style_guide.yaml"),
        this.styleGuide,
      ),
      credo: checkConfig(
        path.join(configDir, "credo.yaml"),
        this.credo,
      ),
      constraints: checkConfig(
        path.join(configDir, "constraints.yaml"),
        this.constraints,
      ),
    };
  }
}

// Singleton instance
let configLoaderInstance: ConfigLoader | null = null;

export function getConfigLoader(): ConfigLoader {
  if (!configLoaderInstance) {
    configLoaderInstance = new ConfigLoader();
  }
  return configLoaderInstance;
}

