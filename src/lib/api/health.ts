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
        // configStatus should have styleGuide, credo, and constraints properties (booleans)
        const configStatusObj = configStatus as { styleGuide?: boolean; credo?: boolean; constraints?: boolean } | null;
        const configHealthy = configStatusObj && 
          (configStatusObj.styleGuide || configStatusObj.credo || configStatusObj.constraints);
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
        
        const result: HealthStatus = {
          status,
          checks: {
            database: dbHealthy ? "healthy" as const : "unhealthy" as const,
            config: configHealthy ? "healthy" as const : "degraded" as const,
          },
          issues: issues.length > 0 ? issues : undefined,
          responseTime,
          uptime: new Date().toISOString(),
        };
        
        return result;
      } catch (error) {
        const errorResult: HealthStatus = {
          status: "unhealthy" as const,
          checks: {
            database: "unhealthy" as const,
            config: "unhealthy" as const,
          },
          issues: [error instanceof Error ? error.message : "Unknown error"],
          responseTime: Date.now() - startTime,
        };
        return errorResult;
      }
    },
    { inputs: [], refetchOnMount: true },
  );
}

