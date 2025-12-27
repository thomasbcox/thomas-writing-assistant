/**
 * Helper functions for safely updating configuration files
 * Prevents accidental overwriting with empty or minimal content
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// Type for fs module to allow dependency injection in tests
type FsModule = typeof import("fs");

export interface ConfigValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that config content is not empty or minimal placeholder content
 */
export function validateConfigContent(
  content: string,
  fileName: string,
  minLength: number = 200,
): ConfigValidationResult {
  const trimmed = content.trim();

  // Check minimum length
  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `Configuration content is too short (${trimmed.length} chars). Minimum required: ${minLength} characters. This prevents accidental overwriting with placeholder content.`,
    };
  }

  // Check for placeholder patterns
  const placeholderPatterns = [
    /^voice:\s*tone:\s*updated\s*$/i,
    /^never_do:\s*-\s*Updated constraint\s*$/i,
    /^core_beliefs:\s*-\s*Updated value\s*$/i,
    /^voice:\s*tone:\s*updated\s*$/i,
    /updated\s+(constraint|value|tone)/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: `Content appears to be placeholder text. Please provide actual configuration content.`,
      };
    }
  }

  // Validate YAML structure - must have at least some meaningful structure
  try {
    const parsed = yaml.load(trimmed);
    if (!parsed || typeof parsed !== "object" || Object.keys(parsed).length === 0) {
      return {
        valid: false,
        error: "Configuration must contain at least one top-level key with content.",
      };
    }
  } catch (error) {
    // YAML validation will be done separately, but we check structure here
    return {
      valid: false,
      error: `Invalid YAML structure: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  return { valid: true };
}

/**
 * Creates a backup of a config file before writing
 * Accepts fs module for dependency injection in tests
 */
export function backupConfigFile(
  filePath: string,
  fsModule: FsModule = fs
): string | null {
  try {
    if (!fsModule.existsSync(filePath)) {
      return null; // No file to backup
    }

    const backupDir = path.join(process.cwd(), "config", ".backups");
    if (!fsModule.existsSync(backupDir)) {
      fsModule.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `${fileName}.${timestamp}.bak`);

    fsModule.copyFileSync(filePath, backupPath);

    // Keep only last 10 backups per file
    const backups = fsModule
      .readdirSync(backupDir)
      .filter((f) => f.startsWith(fileName) && f.endsWith(".bak"))
      .sort()
      .reverse();

    if (backups.length > 10) {
      for (const oldBackup of backups.slice(10)) {
        fsModule.unlinkSync(path.join(backupDir, oldBackup));
      }
    }

    return backupPath;
  } catch (error) {
    console.error(`Failed to create backup for ${filePath}:`, error);
    return null;
  }
}

/**
 * Safely writes a config file with validation and backup
 * Accepts fs module for dependency injection in tests
 */
export function safeWriteConfigFile(
  filePath: string,
  content: string,
  fileName: string,
  fsModule: FsModule = fs,
): { success: boolean; error?: string; backupPath?: string } {
  // Validate content
  const validation = validateConfigContent(content, fileName);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Validate YAML syntax
  try {
    yaml.load(content);
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      return { success: false, error: `Invalid YAML syntax: ${error.message}` };
    }
    return { success: false, error: `YAML validation failed: ${error instanceof Error ? error.message : "Unknown error"}` };
  }

  // Create backup
  const backupPath = backupConfigFile(filePath, fsModule);

  // Write file
  try {
    fsModule.writeFileSync(filePath, content, "utf-8");
    return { success: true, backupPath: backupPath || undefined };
  } catch (error) {
    return {
      success: false,
      error: `Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
