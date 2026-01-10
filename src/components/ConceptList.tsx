"use client";

import { LoadingSpinner } from "./ui/LoadingSpinner";
import { EmptyState } from "./ui/EmptyState";
import type { ConceptListItem } from "~/types/database";

interface ConceptListProps {
  concepts: ConceptListItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
  showTrash: boolean;
  linkCounts?: Map<string, number>;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onEnrich?: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

export function ConceptList({
  concepts,
  isLoading,
  error,
  showTrash,
  linkCounts,
  onView,
  onEdit,
  onEnrich,
  onDelete,
  onRestore,
}: ConceptListProps) {
  const getLinkCount = (conceptId: string) => linkCounts?.get(conceptId) ?? 0;
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    // Display full error details including MSW response data
    const errorDetails = JSON.stringify(error, null, 2);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">
          Error loading concepts: {error.message}
        </p>
        <pre className="text-xs mt-2 overflow-auto max-h-96 bg-red-100 p-2 rounded">
          {errorDetails}
        </pre>
      </div>
    );
  }

  if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
    return (
      <EmptyState
        title={showTrash ? "No trashed concepts" : "No concepts yet"}
        message={
          showTrash
            ? "There are no concepts in the trash."
            : "Get started by creating your first concept above."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {concepts.map((concept) => (
        <div
          key={concept.id}
          className={`p-4 border rounded-lg ${
            concept.status === "trash"
              ? "bg-gray-50 border-gray-200 opacity-75"
              : "bg-white border-gray-200 hover:border-gray-300"
          } transition-colors`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">
                {concept.title} ({getLinkCount(concept.id)})
              </h3>
              {concept.description && (
                <p className="text-sm text-gray-700 mt-1">
                  {concept.description}
                </p>
              )}
              <div className="text-sm text-gray-600 mt-2">
                {concept.creator} | {concept.source} | {concept.year}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Created: {new Date(concept.createdAt).toLocaleDateString()}
                {concept.updatedAt &&
                  ` • Modified: ${new Date(concept.updatedAt).toLocaleDateString()}`}
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onView(concept.id)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View
              </button>
              {concept.status === "trash" ? (
                <button
                  onClick={() => onRestore(concept.id)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Restore
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onEdit(concept.id)}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Edit
                  </button>
                  {onEnrich && (
                    <button
                      onClick={() => onEnrich(concept.id)}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                      title="Enrich with AI chat"
                    >
                      Enrich
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => onDelete(concept.id)}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                {concept.status === "trash" ? "Delete" : "Trash"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

