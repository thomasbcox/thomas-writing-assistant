/**
 * Hook for toggling between dev and prod databases
 */

"use client";

import { useState, useEffect } from "react";
import { useToast } from "~/components/ui/Toast";

type DatabasePreference = "dev" | "prod";

interface DatabaseStatus {
  database: DatabasePreference;
  message: string;
}

export function useDatabaseToggle(externalToast?: { addToast: (message: string, type: "success" | "error" | "info" | "warning") => void }) {
  const [currentDatabase, setCurrentDatabase] = useState<DatabasePreference>("dev");
  const [isLoading, setIsLoading] = useState(false);
  const internalToast = useToast();
  const addToast = externalToast?.addToast ?? internalToast.addToast;

  // In Electron app, database preference is managed by NODE_ENV
  // This hook is kept for compatibility but doesn't actually toggle databases
  // The database is determined by the main process based on NODE_ENV
  const toggleDatabase = async () => {
    addToast("Database toggle is not available in Electron app. Use NODE_ENV to switch databases.", "info");
  };

  // No need to fetch on mount in Electron - always use the environment's database

  return {
    currentDatabase,
    isLoading,
    toggleDatabase,
    isProd: currentDatabase === "prod",
  };
}

