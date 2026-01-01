"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";
import type { ConceptListItem, LinkWithConcepts } from "~/types/database";
import type { LinksByConceptResult, SerializedLinkWithRelations } from "~/hooks/useIPC";

interface LinkListProps {
  /** Links filtered by a specific concept (outgoing/incoming structure) */
  conceptLinks?: LinksByConceptResult;
  /** All links (flat array) */
  allLinks?: LinkWithConcepts[];
  /** All concepts for looking up titles */
  concepts?: ConceptListItem[];
  /** The selected concept title (for display) */
  selectedConceptTitle?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback when delete is clicked */
  onDeleteLink: (sourceId: string, targetId: string) => void;
  /** Callback when link is updated */
  onLinkUpdated?: () => void;
}

interface LinkItemProps {
  link: SerializedLinkWithRelations | LinkWithConcepts;
  onDelete: () => void;
  onEdit: () => void;
  displayMode: "outgoing" | "incoming" | "all";
  concepts?: ConceptListItem[];
  linkNamePairs?: Array<{
    id: string;
    forwardName: string;
    reverseName: string;
    isSymmetric: boolean;
  }>;
}

function LinkItem({ link, onDelete, onEdit, displayMode, concepts }: LinkItemProps) {
  const sourceConcept = concepts?.find((c) => c.id === link.sourceId);
  const targetConcept = concepts?.find((c) => c.id === link.targetId);
  
  const sourceTitle = sourceConcept?.title || link.source?.title || link.sourceId || "Unknown";
  const targetTitle = targetConcept?.title || link.target?.title || link.targetId || "Unknown";
  const forwardName = link.linkName?.forwardName || "unknown";
  const reverseName = link.linkName?.reverseName || "unknown";

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
      <div>
        {displayMode === "outgoing" && (
          <>
            <span className="text-sm text-gray-600">"{forwardName}"</span>
            <span className="mx-2 text-gray-400">→</span>
            <strong>{targetTitle}</strong>
          </>
        )}
        {displayMode === "incoming" && (
          <>
            <strong>{sourceTitle}</strong>
            <span className="mx-2 text-gray-400">←</span>
            <span className="text-sm text-gray-600">"{reverseName}"</span>
          </>
        )}
        {displayMode === "all" && (
          <>
            <strong>{sourceTitle}</strong>
            <span className="mx-2 text-gray-400">→</span>
            <span className="text-sm text-gray-600">"{forwardName}"</span>
            <span className="mx-2 text-gray-400">→</span>
            <strong>{targetTitle}</strong>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface LinkEditDialogProps {
  link: SerializedLinkWithRelations | LinkWithConcepts;
  linkNamePairs: Array<{
    id: string;
    forwardName: string;
    reverseName: string;
    isSymmetric: boolean;
  }>;
  onConfirm: (linkId: string, linkNameId: string, notes?: string) => void;
  onCancel: () => void;
}

function LinkEditDialog({ link, linkNamePairs, onConfirm, onCancel }: LinkEditDialogProps) {
  const [selectedLinkNameId, setSelectedLinkNameId] = useState(link.linkNameId || "");
  const [notes, setNotes] = useState(link.notes || "");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Edit Link</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Name Pair:
            </label>
            <select
              value={selectedLinkNameId}
              onChange={(e) => setSelectedLinkNameId(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {linkNamePairs && Array.isArray(linkNamePairs) && linkNamePairs.length > 0 ? (
                linkNamePairs.map((pair) => (
                  <option key={pair?.id || ""} value={pair?.id || ""}>
                    {pair?.forwardName || "unknown"} → {pair?.reverseName || "unknown"}
                    {pair?.isSymmetric && " (symmetric)"}
                  </option>
                ))
              ) : (
                <option value="">No link name pairs available</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(link.id, selectedLinkNameId, notes || undefined)}
              disabled={!selectedLinkNameId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinkList({
  conceptLinks,
  allLinks,
  concepts,
  selectedConceptTitle,
  isLoading,
  error,
  onDeleteLink,
  onLinkUpdated,
}: LinkListProps) {
  const [editingLink, setEditingLink] = useState<SerializedLinkWithRelations | LinkWithConcepts | null>(null);
  const { data: linkNamePairsData } = api.linkName.getAll.useQuery();
  const linkNamePairs = (linkNamePairsData && Array.isArray(linkNamePairsData))
    ? linkNamePairsData as Array<{ id: string; forwardName: string; reverseName: string; isSymmetric: boolean }>
    : [];

  const updateLinkMutation = api.link.update.useMutation({
    onSuccess: () => {
      setEditingLink(null);
      onLinkUpdated?.();
    },
    onError: (error) => {
      console.error("Error updating link:", error);
      alert(`Failed to update link: ${error.message}`);
    },
  });

  const handleEdit = (link: SerializedLinkWithRelations | LinkWithConcepts) => {
    setEditingLink(link);
  };

  const handleEditConfirm = (linkId: string, linkNameId: string, notes?: string) => {
    updateLinkMutation.mutate({
      id: linkId,
      linkNameId,
      notes,
    });
  };

  const handleEditCancel = () => {
    setEditingLink(null);
  };
  // Display concept-filtered links
  if (conceptLinks && "outgoing" in conceptLinks && "incoming" in conceptLinks) {
    const hasOutgoing = Array.isArray(conceptLinks.outgoing) && conceptLinks.outgoing.length > 0;
    const hasIncoming = Array.isArray(conceptLinks.incoming) && conceptLinks.incoming.length > 0;
    const hasAny = hasOutgoing || hasIncoming;

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-5">
          Links for: {selectedConceptTitle || "Selected Concept"}
        </h2>
        
        {hasOutgoing && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-5">OUTGOING:</h3>
            <div className="space-y-2">
              {conceptLinks.outgoing.map((link) => (
                <LinkItem
                  key={link.id}
                  link={link}
                  displayMode="outgoing"
                  onDelete={() => onDeleteLink(link.sourceId, link.targetId)}
                  onEdit={() => handleEdit(link)}
                  linkNamePairs={linkNamePairs}
                />
              ))}
            </div>
          </div>
        )}

        {hasIncoming && (
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-5">INCOMING:</h3>
            <div className="space-y-2">
              {conceptLinks.incoming.map((link) => (
                <LinkItem
                  key={link.id}
                  link={link}
                  displayMode="incoming"
                  onDelete={() => onDeleteLink(link.sourceId, link.targetId)}
                  onEdit={() => handleEdit(link)}
                  linkNamePairs={linkNamePairs}
                />
              ))}
            </div>
          </div>
        )}

        {!hasAny && (
          <p className="text-gray-500">No links for this concept yet.</p>
        )}
      </div>
    );
  }

  // Display all links
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-5">All Links</h2>
      
      {allLinks && Array.isArray(allLinks) && allLinks.length > 0 ? (
        <div className="space-y-2">
          {allLinks.map((link) => {
            if (!link || !link.id) {
              console.warn("Invalid link object:", link);
              return null;
            }
            return (
              <LinkItem
                key={link.id}
                link={link}
                displayMode="all"
                concepts={concepts}
                onDelete={() => onDeleteLink(link.sourceId, link.targetId)}
                onEdit={() => handleEdit(link)}
                linkNamePairs={linkNamePairs}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500">
          {isLoading
            ? "Loading links..."
            : error
            ? `Error: ${error.message}`
            : "No links yet. Select a concept above to propose links, or create a manual link."}
        </p>
      )}
      {editingLink && (
        <LinkEditDialog
          link={editingLink}
          linkNamePairs={linkNamePairs}
          onConfirm={handleEditConfirm}
          onCancel={handleEditCancel}
        />
      )}
    </div>
  );
}

