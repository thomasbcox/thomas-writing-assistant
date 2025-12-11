/**
 * Data Quality Indicator component
 * Displays data quality metrics and issues
 * Last Updated: 2025-12-11
 */

"use client";

import type { DataQualityReport } from "~/lib/data-validation";

interface DataQualityIndicatorProps {
  report: DataQualityReport | undefined;
  isLoading: boolean;
  onViewDetails?: () => void;
}

export function DataQualityIndicator({
  report,
  isLoading,
  onViewDetails,
}: DataQualityIndicatorProps) {
  if (isLoading || !report) {
    return null;
  }

  // Don't show if no issues
  if (report.totalIssues === 0) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-green-800">Data Quality: Excellent</h3>
            <p className="text-sm text-green-700">All data is valid and complete.</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine severity
  const hasErrors = report.errors > 0;
  const hasWarnings = report.warnings > 0;
  const severity = hasErrors ? "error" : hasWarnings ? "warning" : "info";

  const bgColor =
    severity === "error"
      ? "bg-red-50 border-red-200"
      : severity === "warning"
        ? "bg-yellow-50 border-yellow-200"
        : "bg-blue-50 border-blue-200";

  const textColor =
    severity === "error"
      ? "text-red-800"
      : severity === "warning"
        ? "text-yellow-800"
        : "text-blue-800";

  const iconColor =
    severity === "error"
      ? "text-red-600"
      : severity === "warning"
        ? "text-yellow-600"
        : "text-blue-600";

  return (
    <div className={`${bgColor} border-2 rounded-xl p-4 shadow-sm`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {severity === "error" ? (
            <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ) : severity === "warning" ? (
            <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-semibold ${textColor} mb-1`}>
            Data Quality: {hasErrors ? "Issues Found" : hasWarnings ? "Warnings" : "Info"}
          </h3>
          <p className={`text-sm ${textColor} mb-2`}>
            {report.errors > 0 && `${report.errors} error${report.errors !== 1 ? "s" : ""}`}
            {report.errors > 0 && report.warnings > 0 && ", "}
            {report.warnings > 0 && `${report.warnings} warning${report.warnings !== 1 ? "s" : ""}`}
            {report.errors === 0 && report.warnings === 0 && report.info > 0 && `${report.info} info item${report.info !== 1 ? "s" : ""}`}
          </p>
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className={`text-xs font-semibold ${textColor} hover:underline`}
            >
              View Details →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



