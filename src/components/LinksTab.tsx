"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";
import { LinkProposer } from "./LinkProposer";
import { LinkNameManager } from "./LinkNameManager";
import { LinkList } from "./LinkList";
import { ManualLinkForm } from "./ManualLinkForm";
import { ToastContainer, useToast } from "./ui/Toast";
import { SearchableSelect } from "./ui/SearchableSelect";
import type { ConceptListItem } from "~/types/database";

export function LinksTab() {
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
  const [showLinkNameManager, setShowLinkNameManager] = useState(false);
  const [showManualLinkForm, setShowManualLinkForm] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const utils = api.useUtils();

  // Clear all tab state
  const handleClear = () => {
    setSelectedConceptId("");
    setShowLinkNameManager(false);
    setShowManualLinkForm(false);
    addToast("Tab cleared", "success");
  };

  // Data fetching
  const { data: conceptsData } = api.concept.list.useQuery({
    includeTrash: false,
  });
  const concepts = conceptsData ?? undefined;

  const { data: allLinks, error: allLinksError, isLoading: allLinksLoading } = api.link.getAll.useQuery({ summary: false });
  
  const { data: linkNamePairsData } = api.linkName.getAll.useQuery();
  const linkNamePairs = (linkNamePairsData && Array.isArray(linkNamePairsData)) 
    ? linkNamePairsData as Array<{ id: string; forwardName: string; reverseName: string; isSymmetric: boolean }>
    : undefined;

  const { data: links, error: linksError } = api.link.getByConcept.useQuery(
    { conceptId: selectedConceptId },
    { enabled: !!selectedConceptId },
  );
  
  if (linksError) {
    console.error("Error loading links:", linksError);
  }

  // Mutations
  const deleteLinkMutation = api.link.delete.useMutation({
    onSuccess: () => {
      addToast("Link deleted successfully", "success");
    },
    onError: (error) => {
      addToast(error.message || "Failed to delete link", "error");
    },
  });

  const selectedConcept = concepts?.find((c: ConceptListItem) => c.id === selectedConceptId);

  const handleDeleteLink = (sourceId: string, targetId: string) => {
    deleteLinkMutation.mutate({ sourceId, targetId });
  };

  const handleLinkCreated = () => {
    addToast("Link created successfully", "success");
    setShowManualLinkForm(false);
  };

  // Determine which links to show
  const showConceptLinks = selectedConceptId && links && typeof links === "object" && "outgoing" in links && "incoming" in links;

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="space-y-5">
        {/* Header with Link Name Manager toggle */}
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

        {/* Manual Link Creation */}
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
            <ManualLinkForm
              concepts={concepts}
              linkNamePairs={linkNamePairs}
              onSuccess={handleLinkCreated}
              onError={(msg) => addToast(msg, "error")}
              onCancel={() => setShowManualLinkForm(false)}
            />
          )}
        </div>

        {/* AI Link Proposal */}
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

        {/* Links Display */}
        <LinkList
          conceptLinks={showConceptLinks ? links : undefined}
          allLinks={!showConceptLinks ? allLinks ?? undefined : undefined}
          concepts={concepts}
          selectedConceptTitle={selectedConcept?.title}
          isLoading={allLinksLoading}
          error={allLinksError}
          onDeleteLink={handleDeleteLink}
          onLinkUpdated={() => {
            // Refetch links after update
            void utils.link.getByConcept.invalidate({ conceptId: selectedConceptId });
            void utils.link.getAll.invalidate();
          }}
        />
      </div>
    </>
  );
}
