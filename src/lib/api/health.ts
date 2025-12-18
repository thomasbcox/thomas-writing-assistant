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
 * Fetch health status
 */
async function fetchHealthStatus(): Promise<HealthResponse> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * React Query hook for health status
 * Polls every 60 seconds
 */
export function useHealthStatus() {
  return useQuery<HealthResponse, Error>({
    queryKey: ["health"],
    queryFn: fetchHealthStatus,
    refetchInterval: 60000, // Poll every 60 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}
