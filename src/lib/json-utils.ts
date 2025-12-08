/**
 * Safe JSON parsing utilities
 * Provides error handling for JSON.parse() operations
 */

import { logger } from "./logger";

/**
 * Safely parse JSON string with default fallback
 * @param json - JSON string to parse
 * @param defaultValue - Value to return if parsing fails
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.error(
      {
        error,
        json: json.slice(0, 200), // Log first 200 chars to avoid huge logs
        jsonLength: json.length,
      },
      "Failed to parse JSON",
    );
    return defaultValue;
  }
}

/**
 * Safely parse JSON string that should be an array
 * @param json - JSON string to parse
 * @param defaultValue - Default array to return if parsing fails
 * @returns Parsed array or default value
 */
export function safeJsonParseArray<T>(json: string | null | undefined, defaultValue: T[] = []): T[] {
  if (!json) return defaultValue;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    logger.warn({ json: json.slice(0, 200) }, "JSON parsed but is not an array");
    return defaultValue;
  } catch (error) {
    logger.error(
      {
        error,
        json: json.slice(0, 200),
        jsonLength: json.length,
      },
      "Failed to parse JSON array",
    );
    return defaultValue;
  }
}

/**
 * Safely stringify object to JSON
 * @param obj - Object to stringify
 * @param defaultValue - Default string to return if stringification fails
 * @returns JSON string or default value
 */
export function safeJsonStringify(obj: unknown, defaultValue: string = "{}"): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    logger.error(
      {
        error,
        objType: typeof obj,
      },
      "Failed to stringify JSON",
    );
    return defaultValue;
  }
}

