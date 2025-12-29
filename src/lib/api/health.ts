/**
 * Health Status API for Electron app
 * Uses IPC to check system health
 */

import { useIPCQuery } from "~/hooks/useIPC";
import { ipc } from "~/lib/ipc-client";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: "healthy" | "degraded" | "unhealthy";
    config: "healthy" | "degraded" | "unhealthy";
  };
  issues?: string[];
  uptime?: string;
  responseTime?: number;
}

/**
 * Hook to get system health status
 */
export function useHealthStatus() {
  return useIPCQuery<HealthStatus>(
    async () => {
      const startTime = Date.now();
      
      try {
        // Check database by trying to get config status
        const configStatus = await ipc.config.getStatus();
        
        // Check if we can query concepts (database health)
        let dbHealthy = true;
        try {
          await ipc.concept.list({ includeTrash: false });
        } catch (error) {
          dbHealthy = false;
        }
        
        const responseTime = Date.now() - startTime;
        
        // Determine overall status
        const configHealthy = configStatus.styleGuide || configStatus.credo || configStatus.constraints;
        const issues: string[] = [];
        
        if (!dbHealthy) {
          issues.push("Database connection failed");
        }
        if (!configHealthy) {
          issues.push("Configuration files missing");
        }
        
        let status: "healthy" | "degraded" | "unhealthy" = "healthy";
        if (issues.length > 0) {
          status = issues.some(i => i.includes("Database")) ? "unhealthy" : "degraded";
        }
        
        return {
          status,
          checks: {
            database: dbHealthy ? "healthy" : "unhealthy",
            config: configHealthy ? "healthy" : "degraded",
          },
          issues: issues.length > 0 ? issues : undefined,
          responseTime,
          uptime: new Date().toISOString(),
        };
      } catch (error) {
        return {
          status: "unhealthy",
          checks: {
            database: "unhealthy",
            config: "unhealthy",
          },
          issues: [error instanceof Error ? error.message : "Unknown error"],
          responseTime: Date.now() - startTime,
        };
      }
    },
    {
      refetchOnMount: true,
    },
  );
}

