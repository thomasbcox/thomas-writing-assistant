/**
 * Database preference management
 * Allows runtime switching between dev.db and prod.db
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PREFERENCE_FILE = join(process.cwd(), ".db-preference.json");

export type DatabasePreference = "dev" | "prod";

interface PreferenceData {
  database: DatabasePreference;
  updatedAt: string;
}

/**
 * Get current database preference
 */
export function getDatabasePreference(): DatabasePreference {
  try {
    if (existsSync(PREFERENCE_FILE)) {
      const content = readFileSync(PREFERENCE_FILE, "utf-8");
      const data = JSON.parse(content) as PreferenceData;
      if (data.database === "dev" || data.database === "prod") {
        return data.database;
      }
    }
  } catch (error) {
    console.warn("Failed to read database preference file:", error);
  }
  
  // Default to dev if no preference file exists
  return "dev";
}

/**
 * Set database preference
 */
export function setDatabasePreference(preference: DatabasePreference): void {
  try {
    const data: PreferenceData = {
      database: preference,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(PREFERENCE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    throw new Error(`Failed to write database preference: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the database file path based on preference
 */
export function getDatabasePath(preference?: DatabasePreference): string {
  const pref = preference ?? getDatabasePreference();
  return pref === "prod" ? "./prod.db" : "./dev.db";
}

