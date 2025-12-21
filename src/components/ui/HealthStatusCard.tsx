/**
 * Health Status Card Component
 * Displays system health status with color-coded indicators
 */

"use client";

import { useHealthStatus } from "~/lib/api/health";
import { LoadingSpinner } from "./LoadingSpinner";

interface HealthStatusCardProps {
  onNavigate?: (tab: string) => void;
}

export function HealthStatusCard({ onNavigate }: HealthStatusCardProps) {
  const { data: health, isLoading, error, refetch } = useHealthStatus();

  const getStatusIcon = (status: "healthy" | "degraded" | "unhealthy") => {
    switch (status) {
      case "healthy":
        return "🟢";
      case "degraded":
        return "🟡";
      case "unhealthy":
        return "🔴";
    }
  };

  const getStatusColor = (status: "healthy" | "degraded" | "unhealthy") => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "degraded":
        return "text-yellow-600";
      case "unhealthy":
        return "text-red-600";
    }
  };

  const getStatusBgColor = (status: "healthy" | "degraded" | "unhealthy") => {
    switch (status) {
      case "healthy":
        return "bg-green-50 border-green-200";
      case "degraded":
        return "bg-yellow-50 border-yellow-200";
      case "unhealthy":
        return "bg-red-50 border-red-200";
    }
  };

  const formatUptime = (timestamp: string) => {
    try {
      const now = Date.now();
      const then = new Date(timestamp).getTime();
      const diff = now - then;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      return `${minutes}m`;
    } catch {
      return "Unknown";
    }
  };

  const formatResponseTime = (ms?: number) => {
    if (!ms) return "";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">⚡ System Health</h2>
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  if (error || !health) {
    const errorMessage = error?.message || "Failed to load health status";
    const isTimeout = errorMessage.toLowerCase().includes("timeout");
    const isServiceUnavailable = errorMessage.includes("Service Unavailable") || errorMessage.includes("503");
    
    return (
      <div className="bg-white border-2 border-red-200 rounded-xl p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">⚡ System Health</h2>
        <div className="text-sm text-red-600 mb-3">
          {isTimeout ? (
            <div>
              <div className="font-bold mb-1">Health check timeout</div>
              <div className="text-xs text-gray-600">
                The server may be slow or the database query is taking too long (over 3 seconds).
              </div>
            </div>
          ) : isServiceUnavailable ? (
            <div>
              <div className="font-bold mb-1">Service Unavailable</div>
              <div className="text-xs text-gray-600">
                The health check indicates a system issue. Check server logs for details.
              </div>
            </div>
          ) : (
            errorMessage
          )}
        </div>
        <button
          onClick={async () => {
            // Show loading state immediately and refetch
            await refetch();
          }}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Checking..." : "Retry"}
        </button>
        {(isTimeout || isServiceUnavailable) && (
          <div className="mt-2 text-xs text-gray-600">
            <div className="mb-1">Possible causes:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Database file locked or corrupted</li>
              <li>Server under heavy load</li>
              <li>Database query taking too long</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  const overallStatus = health.status;
  const checks = health.checks;
  const issues = health.issues || [];

  return (
    <div className={`bg-white border-2 rounded-xl p-4 ${getStatusBgColor(overallStatus)}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-gray-900">⚡ System Health</h2>
        <span className={`text-lg font-bold ${getStatusColor(overallStatus)}`}>
          {getStatusIcon(overallStatus)}
        </span>
      </div>

      <div className="space-y-3">
        {/* Server Status */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span>{getStatusIcon(checks.server.status)}</span>
              <span className="text-sm font-bold text-gray-900">Server</span>
            </div>
            <div className="text-xs text-gray-600 ml-6">
              {checks.server.message || "Unknown status"}
              {checks.server.responseTime && ` • ${formatResponseTime(checks.server.responseTime)}`}
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span>{getStatusIcon(checks.database.status)}</span>
              <span className="text-sm font-bold text-gray-900">Database</span>
            </div>
            <div className="text-xs text-gray-600 ml-6">
              {checks.database.message || "Unknown status"}
              {checks.database.responseTime && ` • ${formatResponseTime(checks.database.responseTime)}`}
            </div>
          </div>
        </div>

        {/* Configuration Status */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span>{getStatusIcon(checks.config.status)}</span>
              <span className="text-sm font-bold text-gray-900">Configuration</span>
            </div>
            {checks.config.issues.length > 0 ? (
              <div className="ml-6 space-y-1">
                {checks.config.issues.map((issue, idx) => (
                  <div key={idx} className="text-xs text-gray-600">
                    {issue}
                  </div>
                ))}
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("config")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-1 underline"
                  >
                    Fix →
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-600 ml-6">All config files loaded</div>
            )}
          </div>
        </div>

        {/* API Status */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span>{getStatusIcon(checks.api.status)}</span>
              <span className="text-sm font-bold text-gray-900">API Endpoints</span>
            </div>
            <div className="text-xs text-gray-600 ml-6">
              {checks.api.message || "Unknown status"}
            </div>
          </div>
        </div>

        {/* Issues List */}
        {Array.isArray(issues) && issues.length > 0 && (
          <div className="pt-2 border-t border-gray-300">
            <div className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
              Issues ({issues.length}):
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              {issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>{issue || "Unknown issue"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-gray-300 flex items-center justify-between text-xs text-gray-500">
          <span>Last checked: {formatUptime(health.timestamp)} ago</span>
          <button
            onClick={() => refetch()}
            className="text-blue-600 hover:text-blue-700 font-semibold underline"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
