/**
 * React Query hooks for health status
 */

import { useQuery } from "@tanstack/react-query";

export interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  responseTime?: number;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  environment: "development" | "test" | "production";
  checks: {
    server: HealthCheck;
    database: HealthCheck;
    config: {
      status: "healthy" | "degraded" | "unhealthy";
      styleGuide: { loaded: boolean; isEmpty: boolean };
      credo: { loaded: boolean; isEmpty: boolean };
      constraints: { loaded: boolean; isEmpty: boolean };
      issues: string[];
    };
    api: HealthCheck;
  };
  issues: string[];
}

/**
 * Fetch health status with timeout
 */
async function fetchHealthStatus(): Promise<HealthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout (reduced from 5s)

  try {
    const response = await fetch("/api/health", {
      signal: controller.signal,
      cache: "no-store", // Don't cache health checks
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const statusText = response.status === 503 
        ? "Service Unavailable" 
        : response.statusText;
      throw new Error(`Health check failed: ${statusText} (${response.status})`);
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Health check timeout (3s) - server may be slow or unresponsive");
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error during health check");
  }
}

/**
 * React Query hook for health status
 * Polls every 60 seconds with retry logic
 */
export function useHealthStatus() {
  return useQuery<HealthResponse, Error>({
    queryKey: ["health"],
    queryFn: fetchHealthStatus,
    refetchInterval: 60000, // Poll every 60 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
    gcTime: 60000, // Keep cached data for 60 seconds
  });
}
