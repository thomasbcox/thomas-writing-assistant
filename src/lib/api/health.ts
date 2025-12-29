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
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'health.ts:27',message:'useHealthStatus query started',data:{startTime},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
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
        
        const result = {
          status,
          checks: {
            database: dbHealthy ? "healthy" : "unhealthy",
            config: configHealthy ? "healthy" : "degraded",
          },
          issues: issues.length > 0 ? issues : undefined,
          responseTime,
          uptime: new Date().toISOString(),
        };
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'health.ts:72',message:'useHealthStatus returning result',data:{resultKeys:Object.keys(result),checksKeys:Object.keys(result.checks),status:result.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H2'})}).catch(()=>{});
        // #endregion
        
        return result;
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
    { inputs: [], refetchOnMount: true },
  );
}

