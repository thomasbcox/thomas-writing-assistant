"use client";

import { useState } from "react";
import { api } from "~/lib/trpc/react";
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
    forwardName: "",
    reverseName: "",
    notes: "",
  });
  const { toasts, addToast, removeToast } = useToast();

  const { data: concepts } = api.concept.list.useQuery({
    includeTrash: false,
  });

  const { data: links } = api.link.getByConcept.useQuery(
    { conceptId: selectedConceptId },
    { enabled: !!selectedConceptId },
  );

  const deleteLinkMutation = api.link.delete.useMutation({
    onSuccess: () => {
      addToast("Link deleted successfully", "success");
      void utils.link.getByConcept.invalidate({ conceptId: selectedConceptId });
      void utils.link.getAll.invalidate();
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
        forwardName: "",
        reverseName: "",
        notes: "",
      });
      setShowManualLinkForm(false);
      void utils.link.getByConcept.invalidate({ conceptId: selectedConceptId });
      void utils.link.getAll.invalidate();
    },
    onError: (error) => {
      addToast(error.message || "Failed to create link", "error");
    },
  });

  const utils = api.useUtils();

  const selectedConcept = concepts?.find((c: ConceptListItem) => c.id === selectedConceptId);

  const handleCreateLink = () => {
    if (!manualLinkForm.sourceId || !manualLinkForm.targetId || !manualLinkForm.forwardName) {
      addToast("Please fill in source, target, and forward name", "error");
      return;
    }
    createLinkMutation.mutate({
      sourceId: manualLinkForm.sourceId,
      targetId: manualLinkForm.targetId,
      forwardName: manualLinkForm.forwardName,
      reverseName: manualLinkForm.reverseName || undefined,
      notes: manualLinkForm.notes || undefined,
    });
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="space-y-5">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">Manage Link Names</h2>
          <button
            onClick={() => setShowLinkNameManager(!showLinkNameManager)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {showLinkNameManager ? "Hide" : "Show"} Link Name Manager
          </button>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Forward Name (required)
                </label>
                <input
                  type="text"
                  value={manualLinkForm.forwardName}
                  onChange={(e) =>
                    setManualLinkForm({ ...manualLinkForm, forwardName: e.target.value })
                  }
                  placeholder="e.g., references, builds on, contains"
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Reverse Name (optional)
                </label>
                <input
                  type="text"
                  value={manualLinkForm.reverseName}
                  onChange={(e) =>
                    setManualLinkForm({ ...manualLinkForm, reverseName: e.target.value })
                  }
                  placeholder="Auto-filled if left empty"
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                />
              </div>
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
                disabled={createLinkMutation.isPending}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-base"
              >
                {createLinkMutation.isPending ? "Creating..." : "Create Link"}
              </button>
              <button
                onClick={() => {
                  setShowManualLinkForm(false);
                  setManualLinkForm({
                    sourceId: "",
                    targetId: "",
                    forwardName: "",
                    reverseName: "",
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

      {selectedConceptId && links && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-5">Existing Links</h2>
          {links.outgoing.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-600 mb-5">
                OUTGOING:
              </h3>
              <div className="space-y-2">
                {links.outgoing.map((link: LinkWithConcepts) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div>
                      <span className="text-sm text-gray-600">
                        "{link.forwardName}"
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <strong>{link.target.title}</strong>
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

          {links.incoming.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-5">
                INCOMING:
              </h3>
              <div className="space-y-2">
                {links.incoming.map((link: LinkWithConcepts) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div>
                      <strong>{link.source.title}</strong>
                      <span className="mx-2 text-gray-400">←</span>
                      <span className="text-sm text-gray-600">
                        "{link.reverseName}"
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

          {links.outgoing.length === 0 && links.incoming.length === 0 && (
            <p className="text-gray-500">No links yet.</p>
          )}
        </div>
      )}
      </div>
    </>
  );
}
