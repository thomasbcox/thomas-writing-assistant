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

export interface Prompts {
  linkProposer?: {
    systemPrompt?: string;
    userPromptTemplate?: string;
  };
  conceptProposer?: {
    systemPrompt?: string;
    userPromptTemplate?: string;
  };
  conceptEnricher?: {
    analyzeSystemPrompt?: string;
    enrichMetadataSystemPrompt?: string;
    chatSystemPrompt?: string;
    expandDefinitionSystemPrompt?: string;
  };
  repurposer?: {
    systemPrompt?: string;
    userPromptTemplate?: string;
  };
  anchorExtractor?: {
    systemPrompt?: string;
    userPromptTemplate?: string;
  };
  blogPostGenerator?: {
    systemPrompt?: string;
    userPromptTemplate?: string;
  };
  [key: string]: unknown;
}

export class ConfigLoader {
  private styleGuide: StyleGuide = {};
  private credo: Credo = {};
  private constraints: Constraints = {};
  private prompts: Prompts = {};
  private fsModule: typeof fs;
  private configErrors: Map<string, Error> = new Map();

  constructor(fsModule?: typeof fs) {
    this.fsModule = (fsModule ?? fs) as typeof fs;
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
    this.configErrors.clear();

    // Load style guide
    const styleGuidePath = path.join(configDir, "style_guide.yaml");
    if (this.fsModule.existsSync(styleGuidePath)) {
      try {
        const content = this.fsModule.readFileSync(styleGuidePath, "utf-8");
        this.styleGuide = (yaml.load(content) as StyleGuide) ?? {};
        this.configErrors.delete("style_guide.yaml");
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.configErrors.set("style_guide.yaml", err);
        logger.error(
          { err: error, configFile: "style_guide.yaml", errorMessage: err.message },
          "CRITICAL: Failed to load style guide - content generation may not match user's voice"
        );
        // Don't throw - allow app to start, but track the error
      }
    }

    // Load credo
    const credoPath = path.join(configDir, "credo.yaml");
    if (this.fsModule.existsSync(credoPath)) {
      try {
        const content = this.fsModule.readFileSync(credoPath, "utf-8");
        this.credo = (yaml.load(content) as Credo) ?? {};
        this.configErrors.delete("credo.yaml");
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.configErrors.set("credo.yaml", err);
        logger.error(
          { err: error, configFile: "credo.yaml", errorMessage: err.message },
          "CRITICAL: Failed to load credo - content may not reflect user's values"
        );
      }
    }

    // Load constraints
    const constraintsPath = path.join(configDir, "constraints.yaml");
    if (this.fsModule.existsSync(constraintsPath)) {
      try {
        const content = this.fsModule.readFileSync(constraintsPath, "utf-8");
        this.constraints = (yaml.load(content) as Constraints) ?? {};
        this.configErrors.delete("constraints.yaml");
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.configErrors.set("constraints.yaml", err);
        logger.error(
          { err: error, configFile: "constraints.yaml", errorMessage: err.message },
          "CRITICAL: Failed to load constraints - content may violate user's rules"
        );
      }
    }

    // Load prompts (optional - falls back to defaults if not present)
    const promptsPath = path.join(configDir, "prompts.yaml");
    if (this.fsModule.existsSync(promptsPath)) {
      try {
        const content = this.fsModule.readFileSync(promptsPath, "utf-8");
        this.prompts = (yaml.load(content) as Prompts) ?? {};
        this.configErrors.delete("prompts.yaml");
      } catch (error) {
        // Prompts are optional, so we only warn (don't treat as critical error)
        logger.warn(
          { err: error, configFile: "prompts.yaml", errorMessage: error instanceof Error ? error.message : String(error) },
          "Failed to load prompts.yaml - using default prompts"
        );
      }
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

  getPrompts(): Prompts {
    return this.prompts;
  }

  /**
   * Get a prompt from config, with fallback to default
   */
  getPrompt(path: string, defaultValue: string): string {
    const parts = path.split(".");
    let value: unknown = this.prompts;
    
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return defaultValue;
      }
    }
    
    return typeof value === "string" ? value : defaultValue;
  }

  /**
   * Check if critical config files are valid
   * Returns true if all configs loaded successfully, false if any failed
   */
  isConfigValid(): boolean {
    return this.configErrors.size === 0;
  }

  /**
   * Get all config errors
   */
  getConfigErrors(): Map<string, Error> {
    return new Map(this.configErrors);
  }

  /**
   * Get error for a specific config file
   */
  getConfigError(configFile: string): Error | undefined {
    return this.configErrors.get(configFile);
  }

  /**
   * Validate that configs are loaded before content generation
   * Throws an error if critical configs failed to load or are missing
   */
  validateConfigForContentGeneration(): void {
    // Check for parse errors first
    if (this.configErrors.size > 0) {
      const errorMessages = Array.from(this.configErrors.entries())
        .map(([file, err]) => `${file}: ${err.message}`)
        .join("; ");
      throw new Error(
        `Cannot generate content: Critical config files failed to load. ${errorMessages}. ` +
        `Please fix the config files in the Config tab before generating content.`
      );
    }

    // Check if required config files exist and are loaded
    const configDir = path.join(process.cwd(), "config");
    const styleGuidePath = path.join(configDir, "style_guide.yaml");
    const styleGuideExists = this.fsModule.existsSync(styleGuidePath);
    const styleGuideLoaded = styleGuideExists && Object.keys(this.styleGuide).length > 0;

    if (!styleGuideLoaded) {
      throw new Error(
        `Cannot generate content: Style guide is missing or empty. ` +
        `Please create or fix the style_guide.yaml file in the Config tab before generating content.`
      );
    }
  }

  getConfigStatus(): {
    styleGuide: { loaded: boolean; isEmpty: boolean; error?: string };
    credo: { loaded: boolean; isEmpty: boolean; error?: string };
    constraints: { loaded: boolean; isEmpty: boolean; error?: string };
  } {
    const configDir = path.join(process.cwd(), "config");
    
    const styleGuidePath = path.join(configDir, "style_guide.yaml");
    const styleGuideExists = this.fsModule.existsSync(styleGuidePath);
    const styleGuideLoaded = styleGuideExists && Object.keys(this.styleGuide).length > 0;
    const styleGuideEmpty = !styleGuideLoaded || Object.keys(this.styleGuide).length === 0;

    const credoPath = path.join(configDir, "credo.yaml");
    const credoExists = this.fsModule.existsSync(credoPath);
    const credoLoaded = credoExists && Object.keys(this.credo).length > 0;
    const credoEmpty = !credoLoaded || Object.keys(this.credo).length === 0;

    const constraintsPath = path.join(configDir, "constraints.yaml");
    const constraintsExists = this.fsModule.existsSync(constraintsPath);
    const constraintsLoaded = constraintsExists && Object.keys(this.constraints).length > 0;
    const constraintsEmpty = !constraintsLoaded || Object.keys(this.constraints).length === 0;

    const styleGuideError = this.configErrors.get("style_guide.yaml");
    const credoError = this.configErrors.get("credo.yaml");
    const constraintsError = this.configErrors.get("constraints.yaml");

    return {
      styleGuide: {
        loaded: styleGuideLoaded,
        isEmpty: styleGuideEmpty,
        error: styleGuideError?.message,
      },
      credo: {
        loaded: credoLoaded,
        isEmpty: credoEmpty,
        error: credoError?.message,
      },
      constraints: {
        loaded: constraintsLoaded,
        isEmpty: constraintsEmpty,
        error: constraintsError?.message,
      },
    };
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
}

// Singleton instance
let configLoaderInstance: ConfigLoader | null = null;

export function getConfigLoader(): ConfigLoader {
  if (!configLoaderInstance) {
    configLoaderInstance = new ConfigLoader();
  }
  return configLoaderInstance;
}

