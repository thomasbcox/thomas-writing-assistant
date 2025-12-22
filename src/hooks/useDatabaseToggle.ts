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

  // Fetch current database preference
  const fetchCurrentDatabase = async () => {
    try {
      const response = await fetch("/api/database/toggle");
      if (response.ok) {
        const data = (await response.json()) as DatabaseStatus;
        setCurrentDatabase(data.database);
      }
    } catch (error) {
      console.error("Failed to fetch database preference:", error);
    }
  };

  // Toggle database
  const toggleDatabase = async () => {
    setIsLoading(true);
    try {
      const newDatabase: DatabasePreference = currentDatabase === "dev" ? "prod" : "dev";
      const response = await fetch("/api/database/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database: newDatabase }),
      });

      if (response.ok) {
        const data = (await response.json()) as DatabaseStatus & { warning?: string };
        setCurrentDatabase(data.database);
        addToast(data.message, "success");
        if (data.warning) {
          addToast(data.warning, "warning");
        }
        // Refresh the page to ensure all data is reloaded from the new database
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorData = (await response.json()) as { error?: string };
        addToast(errorData.error || "Failed to toggle database", "error");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to toggle database";
      addToast(errorMessage, "error");
      console.error("Error toggling database:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    void fetchCurrentDatabase();
  }, []);

  return {
    currentDatabase,
    isLoading,
    toggleDatabase,
    isProd: currentDatabase === "prod",
  };
}

