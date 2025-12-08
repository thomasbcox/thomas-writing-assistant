"use client";

import { LoadingSpinner } from "./ui/LoadingSpinner";

interface ConceptGenerationStatusProps {
  isGenerating: boolean;
  elapsedTime?: number;
}

export function ConceptGenerationStatus({
  isGenerating,
  elapsedTime = 0,
}: ConceptGenerationStatusProps) {
  if (!isGenerating) return null;

  return (
    <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <LoadingSpinner size="sm" />
        <span className="text-sm font-semibold text-blue-900">
          Processing your request...
        </span>
      </div>
      <p className="text-xs text-blue-700 ml-8">
        This may take 1-3 minutes for large documents. Please wait...
        {elapsedTime > 0 && ` (${elapsedTime}s)`}
      </p>
      {elapsedTime > 60 && (
        <p className="text-xs text-yellow-700 mt-2 ml-8 font-medium">
          ⚠️ This is taking longer than usual. The document may be very large.
        </p>
      )}
    </div>
  );
}

