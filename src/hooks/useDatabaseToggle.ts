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

  // #region agent log
  // Debug: Log that useDatabaseToggle initialized without fetch
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDatabaseToggle.ts:22',message:'useDatabaseToggle initialized - no fetch',data:{currentDatabase},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4-H5'})}).catch(()=>{});
  // #endregion

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

