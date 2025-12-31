"use client";

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
}

interface LinkItemProps {
  link: SerializedLinkWithRelations | LinkWithConcepts;
  onDelete: () => void;
  displayMode: "outgoing" | "incoming" | "all";
  concepts?: ConceptListItem[];
}

function LinkItem({ link, onDelete, displayMode, concepts }: LinkItemProps) {
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
      <button
        onClick={onDelete}
        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
      >
        Delete
      </button>
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
}: LinkListProps) {
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
    </div>
  );
}

