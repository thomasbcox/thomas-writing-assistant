"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";
import { ToastContainer, useToast } from "./ui/Toast";
import { LoadingSpinner } from "./ui/LoadingSpinner";

interface ConceptCandidate {
  title: string;
  content: string;
  summary: string;
  description?: string;
}

interface ConceptCandidateListProps {
  candidates: ConceptCandidate[];
  defaultCreator?: string;
  defaultYear?: string;
  onCandidateAccepted?: (index: number) => void;
}

export function ConceptCandidateList({
  candidates,
  defaultCreator,
  defaultYear,
  onCandidateAccepted,
}: ConceptCandidateListProps) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    content: string;
    creator: string;
    source: string;
    year: string;
  }>({
    title: "",
    description: "",
    content: "",
    creator: "",
    source: "",
    year: "",
  });
  const { toasts, addToast, removeToast } = useToast();
  const utils = api.useUtils();

  const createMutation = api.concept.create.useMutation({
    onSuccess: () => {
      const acceptedIndex = editingIndex;
      setEditingIndex(null);
      addToast("Concept created successfully!", "success");
      // Invalidate concept list queries so the Concepts tab refreshes
      void utils.concept.list.invalidate();
      // Remove the accepted candidate from the list
      if (acceptedIndex !== null && onCandidateAccepted) {
        onCandidateAccepted(acceptedIndex);
      }
    },
    onError: (error) => {
      // Error is already displayed to user via toast
      const errorMessage = error.message || "Failed to create concept. Please check all required fields.";
      addToast(errorMessage, "error");
    },
  });

  const handleUseCandidate = (candidate: ConceptCandidate, index: number) => {
    setEditingIndex(index);
    setFormData({
      title: candidate.title,
      description: candidate.description ?? "",
      content: candidate.content,
      creator: defaultCreator || "",
      source: "Unknown", // Default to "Unknown" instead of empty string
      year: defaultYear || new Date().getFullYear().toString(), // Default to current year
    });
  };

  const handleCreate = (index: number) => {
    createMutation.mutate(formData);
    // Don't setEditingIndex(null) here - let onSuccess handle it after removing from list
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-5">
        Generated Concept Candidates ({candidates.length})
      </h2>

      <div className="space-y-4">
        {candidates.map((candidate, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-semibold text-lg">{candidate.title}</h3>
                {candidate.description && (
                  <p className="text-sm text-gray-600 italic mt-1">
                    {candidate.description}
                  </p>
                )}
                {candidate.summary && (
                  <p className="text-sm text-gray-700 mt-2">{candidate.summary}</p>
                )}
              </div>
            </div>

            {editingIndex === index ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-5">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    rows={6}
                    className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-5">
                      Creator
                    </label>
                    <input
                      type="text"
                      value={formData.creator}
                      onChange={(e) =>
                        setFormData({ ...formData, creator: e.target.value })
                      }
                      className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-5">
                      Source
                    </label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value })
                      }
                      className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-5">
                      Year
                    </label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={(e) =>
                        setFormData({ ...formData, year: e.target.value })
                      }
                      className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCreate(index)}
                    disabled={createMutation.isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {createMutation.isLoading && <LoadingSpinner size="sm" />}
                    <span>{createMutation.isLoading ? "Creating..." : "Create Concept"}</span>
                  </button>
                  <button
                    onClick={() => setEditingIndex(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setViewingIndex(index)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Full
                </button>
                <button
                  onClick={() => handleUseCandidate(candidate, index)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Use This
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {viewingIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-2xl font-semibold">
                {candidates[viewingIndex]?.title}
              </h2>
              <button
                onClick={() => setViewingIndex(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-gray-800">
              {candidates[viewingIndex]?.content}
            </pre>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

