"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";
import { LinkProposer } from "./LinkProposer";
import { LinkNameManager } from "./LinkNameManager";
import { ToastContainer, useToast } from "./ui/Toast";
import { SearchableSelect } from "./ui/SearchableSelect";
import type { ConceptListItem, LinkWithConcepts } from "~/types/database";

export function LinksTab() {
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
  const [showLinkNameManager, setShowLinkNameManager] = useState(false);
  const [showManualLinkForm, setShowManualLinkForm] = useState(false);
  const [manualLinkForm, setManualLinkForm] = useState({
    sourceId: "",
    targetId: "",
    linkNameId: "",
    notes: "",
  });
  const { toasts, addToast, removeToast } = useToast();

  // Clear all tab state
  const handleClear = () => {
    setSelectedConceptId("");
    setShowLinkNameManager(false);
    setShowManualLinkForm(false);
    setManualLinkForm({
      sourceId: "",
      targetId: "",
      linkNameId: "",
      notes: "",
    });
    addToast("Tab cleared", "success");
  };

  const { data: concepts } = api.concept.list.useQuery({
    includeTrash: false,
  });

  // Get all links (for display when no concept is selected)
  const { data: allLinks, error: allLinksError, isLoading: allLinksLoading } = api.link.getAll.useQuery({ summary: false });
  
  // Log errors for debugging
  if (allLinksError) {
    console.error("Error loading all links:", allLinksError);
  }
  
  // Debug logging
  if (allLinks && Array.isArray(allLinks)) {
    console.log("All links data:", { count: allLinks.length, links: allLinks });
  }
  
  // Get all link name pairs (used in both manual form and display)
  const { data: linkNamePairs } = api.linkName.getAll.useQuery();

  // Get links for selected concept (when a concept is selected)
  const { data: links, error: linksError } = api.link.getByConcept.useQuery(
    { conceptId: selectedConceptId },
    { enabled: !!selectedConceptId },
  );
  
  // Log errors for debugging
  if (linksError) {
    console.error("Error loading links:", linksError);
  }

  const deleteLinkMutation = api.link.delete.useMutation({
    onSuccess: () => {
      addToast("Link deleted successfully", "success");
      // Refetch will be handled by component state updates
    },
    onError: (error) => {
      addToast(error.message || "Failed to delete link", "error");
    },
  });

  const createLinkMutation = api.link.create.useMutation({
    onSuccess: () => {
      addToast("Link created successfully", "success");
      setManualLinkForm({
        sourceId: "",
        targetId: "",
        linkNameId: "",
        notes: "",
      });
      setShowManualLinkForm(false);
      // Refetch will be handled by component state updates
    },
    onError: (error) => {
      addToast(error.message || "Failed to create link", "error");
    },
  });

  // Note: useUtils() from React Query is not available in IPC hooks
  // Components should use refetch() from individual queries instead

  const selectedConcept = concepts?.find((c: ConceptListItem) => c.id === selectedConceptId);

  const handleCreateLink = () => {
    if (!manualLinkForm.sourceId || !manualLinkForm.targetId || !manualLinkForm.linkNameId) {
      addToast("Please fill in source, target, and link name pair", "error");
      return;
    }
    createLinkMutation.mutate({
      sourceId: manualLinkForm.sourceId,
      targetId: manualLinkForm.targetId,
      linkNameId: manualLinkForm.linkNameId,
      notes: manualLinkForm.notes || undefined,
    });
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="space-y-5">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">Links</h2>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
              title="Clear all selections and forms"
            >
              Clear
            </button>
            <button
              onClick={() => setShowLinkNameManager(!showLinkNameManager)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {showLinkNameManager ? "Hide" : "Show"} Link Name Manager
            </button>
          </div>
        </div>
        {showLinkNameManager && <LinkNameManager />}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">Create Manual Link</h2>
          <button
            onClick={() => setShowManualLinkForm(!showManualLinkForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showManualLinkForm ? "Hide" : "Create Link"}
          </button>
        </div>
        {showManualLinkForm && (
          <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="Source Concept"
                options={
                  concepts?.map((c: ConceptListItem) => ({
                    value: c.id,
                    label: c.title,
                  })) ?? []
                }
                value={manualLinkForm.sourceId}
                onChange={(value) =>
                  setManualLinkForm({ ...manualLinkForm, sourceId: value })
                }
                placeholder="-- Select source --"
              />
              <SearchableSelect
                label="Target Concept"
                options={
                  concepts
                    ?.filter((c: ConceptListItem) => c.id !== manualLinkForm.sourceId)
                    .map((c: ConceptListItem) => ({
                      value: c.id,
                      label: c.title,
                    })) ?? []
                }
                value={manualLinkForm.targetId}
                onChange={(value) =>
                  setManualLinkForm({ ...manualLinkForm, targetId: value })
                }
                placeholder="-- Select target --"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Link Name Pair (required)
              </label>
              <select
                value={manualLinkForm.linkNameId}
                onChange={(e) =>
                  setManualLinkForm({ ...manualLinkForm, linkNameId: e.target.value })
                }
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="">-- Select link name pair --</option>
                {linkNamePairs && Array.isArray(linkNamePairs) && linkNamePairs.length > 0 ? (
                  linkNamePairs.map((pair) => (
                    <option key={pair?.id || ""} value={pair?.id || ""}>
                      {pair?.forwardName || "unknown"} → {pair?.reverseName || "unknown"}
                      {pair?.isSymmetric && " (symmetric)"}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No link name pairs available</option>
                )}
              </select>
              {manualLinkForm.linkNameId && linkNamePairs && Array.isArray(linkNamePairs) && (
                <div className="mt-2 text-sm text-gray-600">
                  <div>
                    Forward: <strong>{linkNamePairs.find((p) => p?.id === manualLinkForm.linkNameId)?.forwardName || "unknown"}</strong>
                  </div>
                  <div>
                    Reverse: <strong>{linkNamePairs.find((p) => p?.id === manualLinkForm.linkNameId)?.reverseName || "unknown"}</strong>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={manualLinkForm.notes}
                onChange={(e) =>
                  setManualLinkForm({ ...manualLinkForm, notes: e.target.value })
                }
                rows={3}
                placeholder="Additional notes about this link..."
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateLink}
                disabled={createLinkMutation.isLoading}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-base"
              >
                {createLinkMutation.isLoading ? "Creating..." : "Create Link"}
              </button>
              <button
                onClick={() => {
                  setShowManualLinkForm(false);
                  setManualLinkForm({
                    sourceId: "",
                    targetId: "",
                    linkNameId: "",
                    notes: "",
                  });
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-5">Propose Links (AI)</h2>
        <div className="mb-5">
          <SearchableSelect
            label="Select Concept"
            options={
              concepts?.map((c: ConceptListItem) => ({
                value: c.id,
                label: c.title,
              })) ?? []
            }
            value={selectedConceptId}
            onChange={setSelectedConceptId}
            placeholder="-- Select a concept --"
          />
        </div>

        {selectedConceptId && (
          <LinkProposer
            conceptId={selectedConceptId}
            conceptTitle={selectedConcept?.title ?? ""}
          />
        )}
      </div>

      {/* Show all links when no concept is selected, or filtered links when a concept is selected */}
      {selectedConceptId && links && typeof links === "object" && "outgoing" in links && "incoming" in links ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-5">
            Links for: {selectedConcept?.title || selectedConceptId}
          </h2>
          {Array.isArray(links.outgoing) && links.outgoing.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-600 mb-5">
                OUTGOING:
              </h3>
              <div className="space-y-2">
                {links.outgoing.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div>
                      <span className="text-sm text-gray-600">
                        "{link.linkName?.forwardName || "unknown"}"
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <strong>{link.target?.title || link.targetId}</strong>
                    </div>
                    <button
                      onClick={() =>
                        deleteLinkMutation.mutate({
                          sourceId: link.sourceId,
                          targetId: link.targetId,
                        })
                      }
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(links.incoming) && links.incoming.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-5">
                INCOMING:
              </h3>
              <div className="space-y-2">
                {links.incoming.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div>
                      <strong>{link.source?.title || link.sourceId}</strong>
                      <span className="mx-2 text-gray-400">←</span>
                      <span className="text-sm text-gray-600">
                        "{link.linkName?.reverseName || "unknown"}"
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        deleteLinkMutation.mutate({
                          sourceId: link.sourceId,
                          targetId: link.targetId,
                        })
                      }
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!Array.isArray(links.outgoing) || links.outgoing.length === 0) && (!Array.isArray(links.incoming) || links.incoming.length === 0) && (
            <p className="text-gray-500">No links for this concept yet.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-5">All Links</h2>
          {allLinks && Array.isArray(allLinks) && allLinks.length > 0 ? (
            <div className="space-y-2">
              {allLinks.map((link: LinkWithConcepts) => {
                // Ensure link has required properties
                if (!link || !link.id) {
                  console.warn("Invalid link object:", link);
                  return null;
                }
                const sourceConcept = concepts?.find((c: ConceptListItem) => c.id === link.sourceId);
                const targetConcept = concepts?.find((c: ConceptListItem) => c.id === link.targetId);
                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div>
                      <strong>{sourceConcept?.title || link.source?.title || link.sourceId || "Unknown"}</strong>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="text-sm text-gray-600">
                        "{link.linkName?.forwardName || "unknown"}"
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <strong>{targetConcept?.title || link.target?.title || link.targetId || "Unknown"}</strong>
                    </div>
                    <button
                      onClick={() =>
                        deleteLinkMutation.mutate({
                          sourceId: link.sourceId,
                          targetId: link.targetId,
                        })
                      }
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">
              {allLinksLoading ? "Loading links..." : allLinksError ? `Error: ${allLinksError.message}` : "No links yet. Select a concept above to propose links, or create a manual link."}
            </p>
          )}
        </div>
      )}
      </div>
    </>
  );
}
