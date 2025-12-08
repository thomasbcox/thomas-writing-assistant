"use client";

import type { AnchorWithRepurposed, RepurposedContent } from "~/types/database";

interface PDFProcessingStatusProps {
  status: {
    stage: string;
    result?: {
      anchor: AnchorWithRepurposed;
      repurposedContent: RepurposedContent[];
      metadata: {
        title: string;
        painPoints: string[];
        solutionSteps: string[];
        proof?: string;
      };
    };
  } | null;
}

export function PDFProcessingStatus({ status }: PDFProcessingStatusProps) {
  if (!status) return null;

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      {status.stage === "creating_capsule" && (
        <p className="text-blue-700">Creating new capsule...</p>
      )}
      {status.stage === "extracting" && (
        <p className="text-blue-700">Extracting text from PDF...</p>
      )}
      {status.stage === "analyzing" && (
        <p className="text-blue-700">Analyzing content and generating derivatives...</p>
      )}
      {status.stage === "complete" && status.result && (
        <div className="space-y-4">
          <div className="text-green-700 font-semibold">
            ✓ Anchor created and derivatives generated!
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Anchor: {status.result.metadata.title}</h4>
            {status.result.metadata.painPoints.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">Pain Points:</p>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {status.result.metadata.painPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {status.result.metadata.solutionSteps.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">Solution Steps:</p>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {status.result.metadata.solutionSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mt-4">
              Generated Derivatives ({status.result.repurposedContent.length}):
            </h4>
            <div className="mt-2 space-y-2">
              {status.result.repurposedContent.map((item) => (
                <div key={item.id} className="p-3 bg-white border border-gray-200 rounded">
                  <p className="text-xs font-semibold text-blue-600 uppercase">
                    {item.type.replace(/_/g, " ")}
                  </p>
                  {item.guidance && (
                    <p className="text-xs font-medium text-blue-500 italic mt-1">
                      Guidance: {item.guidance}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 mt-1 line-clamp-3">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {status.stage === "error" && (
        <p className="text-red-700">Error processing PDF. Please try again.</p>
      )}
    </div>
  );
}

