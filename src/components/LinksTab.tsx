"use client";

import { useState, useMemo } from "react";
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
  const [showOnlyZeroLinks, setShowOnlyZeroLinks] = useState(false);
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
  
  const { data: linkCountsData } = api.link.getCountsByConcept.useQuery();
  
  const { data: linkNamePairsData } = api.linkName.getAll.useQuery();
  const linkNamePairs = (linkNamePairsData && Array.isArray(linkNamePairsData)) 
    ? linkNamePairsData as Array<{ id: string; forwardName: string; reverseName: string; isSymmetric: boolean }>
    : undefined;

  const { data: links, error: linksError } = api.link.getByConcept.useQuery(
    { conceptId: selectedConceptId },
    { enabled: !!selectedConceptId },
  );

  // Create link counts map
  const linkCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (linkCountsData && Array.isArray(linkCountsData)) {
      linkCountsData.forEach((item) => {
        map.set(item.conceptId, item.count);
      });
    }
    return map;
  }, [linkCountsData]);

  // Get link count for a concept (defaults to 0)
  const getLinkCount = (conceptId: string) => linkCountsMap.get(conceptId) ?? 0;

  // Filter and prepare options for SearchableSelect
  const conceptOptions = useMemo(() => {
    if (!concepts) return [];
    
    let filtered = concepts;
    
    // Filter by zero links if checkbox is checked
    if (showOnlyZeroLinks) {
      filtered = filtered.filter((c) => getLinkCount(c.id) === 0);
    }
    
    return filtered.map((c: ConceptListItem) => {
      const count = getLinkCount(c.id);
      return {
        value: c.id,
        label: `${c.title} (${count})`,
      };
    });
  }, [concepts, showOnlyZeroLinks, linkCountsMap]);
  
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
    // Invalidate link counts to refresh
    void utils.link.getCountsByConcept.invalidate();
  };

  const handleLinkCreated = () => {
    addToast("Link created successfully", "success");
    setShowManualLinkForm(false);
    // Invalidate link counts to refresh
    void utils.link.getCountsByConcept.invalidate();
    void utils.link.getAll.invalidate();
    if (selectedConceptId) {
      void utils.link.getByConcept.invalidate({ conceptId: selectedConceptId });
    }
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
            <div className="mb-3">
              <SearchableSelect
                label="Select Concept"
                options={conceptOptions}
                value={selectedConceptId}
                onChange={setSelectedConceptId}
                placeholder="-- Select a concept --"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="zero-links-filter"
                checked={showOnlyZeroLinks}
                onChange={(e) => setShowOnlyZeroLinks(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="zero-links-filter"
                className="ml-2 text-sm font-medium text-gray-700"
              >
                Show only concepts with zero links
              </label>
            </div>
          </div>

          {selectedConceptId && (
            <>
              <LinkProposer
                conceptId={selectedConceptId}
                conceptTitle={selectedConcept?.title ?? ""}
              />
            </>
          )}
        </div>

        {/* Links Display */}
        {selectedConceptId && showConceptLinks && (
          <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-blue-900">
                Existing Links for: {selectedConcept?.title}
              </h2>
              <div className="text-sm text-gray-600">
                {links && "outgoing" in links && "incoming" in links
                  ? `Outgoing: ${links.outgoing.length} | Incoming: ${links.incoming.length}`
                  : ""}
              </div>
            </div>
            <LinkList
              conceptLinks={links}
              allLinks={undefined}
              concepts={concepts}
              selectedConceptTitle={selectedConcept?.title}
              isLoading={false}
              error={linksError || undefined}
              onDeleteLink={handleDeleteLink}
              onLinkUpdated={() => {
                // Refetch links after update
                void utils.link.getByConcept.invalidate({ conceptId: selectedConceptId });
                void utils.link.getAll.invalidate();
                void utils.link.getCountsByConcept.invalidate();
              }}
            />
          </div>
        )}
        {!selectedConceptId && (
          <LinkList
            conceptLinks={undefined}
            allLinks={allLinks ?? undefined}
            concepts={concepts}
            selectedConceptTitle={undefined}
            isLoading={allLinksLoading}
            error={allLinksError}
            onDeleteLink={handleDeleteLink}
            onLinkUpdated={() => {
              // Refetch links after update
              void utils.link.getAll.invalidate();
              void utils.link.getCountsByConcept.invalidate();
            }}
          />
        )}
      </div>
    </>
  );
}
