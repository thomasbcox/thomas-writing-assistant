"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { useTimer } from "~/hooks/useTimer";
import { ToastContainer, useToast } from "./ui/Toast";

interface LinkProposerProps {
  conceptId: string;
  conceptTitle: string;
}

export function LinkProposer({ conceptId, conceptTitle }: LinkProposerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const utils = api.useUtils();
  const { elapsedSeconds, formattedTime, showCounter } = useTimer(isLoading);
  const { toasts, addToast, removeToast } = useToast();

  const { data: linkNamePairsData, error: linkNamePairsError } = api.linkName.getAll.useQuery();
  const linkNamePairs = (linkNamePairsData && Array.isArray(linkNamePairsData))
    ? linkNamePairsData as Array<{ id: string; forwardName: string; reverseName: string; isSymmetric: boolean }>
    : undefined;

  // Get existing links to filter out already-linked proposals
  const { data: existingLinks, refetch: refetchExistingLinks } = api.link.getByConcept.useQuery(
    { conceptId },
    { enabled: !!conceptId },
  );
  
  if (linkNamePairsError) {
    console.error("Error loading link name pairs:", linkNamePairsError);
    // Show error toast if not already shown
    if (!toasts.some(t => t.message.includes("link name pairs"))) {
      addToast("Failed to load link name pairs. Please refresh the page.", "error");
    }
  }

  const createLinkMutation = api.link.create.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      void utils.link.getByConcept.invalidate({ conceptId });
      void utils.link.getAll.invalidate();
      // Immediately refetch existingLinks to update the filter
      void refetchExistingLinks();
      // Refetch proposals to remove the confirmed proposal from the list
      void refetch();
      addToast("Link created successfully!", "success");
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to create link. Please try again.";
      addToast(errorMessage, "error");
      console.error("Error creating link:", error);
    },
  });

  const { data: proposals, refetch, error: proposalsError } = api.concept.proposeLinks.useQuery(
    { conceptId, maxProposals: 5 },
    { 
      enabled: false, // Don't run automatically - only when button is clicked
      queryKey: `concept:proposeLinks:${conceptId}`, // Register in cache for invalidation
    },
  );

  const handlePropose = async () => {
    // #region agent log
    console.log("[DEBUG] handlePropose called", { conceptId });
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LinkProposer.tsx:65',message:'handlePropose entry',data:{conceptId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch((e)=>{console.error("[DEBUG] Log fetch failed:",e);});
    // #endregion
    setIsLoading(true);
    try {
      // #region agent log
      console.log("[DEBUG] Calling refetch...");
      fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LinkProposer.tsx:68',message:'Before refetch',data:{conceptId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch((e)=>{console.error("[DEBUG] Log fetch failed:",e);});
      // #endregion
      const result = await refetch();
      // #region agent log
      console.log("[DEBUG] Refetch result:", result);
      fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LinkProposer.tsx:70',message:'After refetch',data:{conceptId,hasData:!!result?.data,hasError:!!result?.error,dataType:typeof result?.data,dataLength:Array.isArray(result?.data)?result.data.length:'not-array'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch((e)=>{console.error("[DEBUG] Log fetch failed:",e);});
      // #endregion
      // Use the result from refetch directly instead of relying on state
      const resultProposals = result?.data;
      const resultError = result?.error || proposalsError;
      
      if (resultError) {
        // #region agent log
        console.error("[DEBUG] Error in result:", resultError);
        fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LinkProposer.tsx:74',message:'Result error',data:{conceptId,errorMessage:resultError.message,errorName:resultError.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch((e)=>{console.error("[DEBUG] Log fetch failed:",e);});
        // #endregion
        const errorMessage = resultError.message || "Failed to propose links. Please try again.";
        addToast(errorMessage, "error");
        console.error("Error proposing links:", resultError);
      } else if (resultProposals && Array.isArray(resultProposals) && resultProposals.length === 0) {
        addToast("No link proposals found for this concept.", "info");
      } else if (resultProposals && Array.isArray(resultProposals) && resultProposals.length > 0) {
        addToast(`Found ${resultProposals.length} link proposal${resultProposals.length !== 1 ? "s" : ""}`, "success");
      } else {
        // #region agent log
        console.warn("[DEBUG] No proposals returned - unexpected state", { resultProposals, result });
        fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LinkProposer.tsx:82',message:'No proposals - unexpected',data:{conceptId,resultProposals,resultType:typeof result,hasResult:!!result},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch((e)=>{console.error("[DEBUG] Log fetch failed:",e);});
        // #endregion
        addToast("No proposals returned. The query may still be processing.", "info");
      }
    } catch (error) {
      // #region agent log
      console.error("[DEBUG] Exception in handlePropose:", error);
      fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LinkProposer.tsx:84',message:'Exception caught',data:{conceptId,errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch((e)=>{console.error("[DEBUG] Log fetch failed:",e);});
      // #endregion
      const errorMessage = error instanceof Error ? error.message : "Failed to propose links. Please try again.";
      addToast(errorMessage, "error");
      console.error("Error proposing links:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = (targetId: string, linkNameId: string) => {
    createLinkMutation.mutate({
      sourceId: conceptId,
      targetId,
      linkNameId,
    });
  };

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <button
        onClick={handlePropose}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isLoading && <LoadingSpinner size="sm" />}
        <span>
          {isLoading ? "Proposing Links..." : "Propose Links"}
          {isLoading && showCounter && ` (${formattedTime})`}
        </span>
      </button>

      {proposals && Array.isArray(proposals) && proposals.length > 0 && linkNamePairs && Array.isArray(linkNamePairs) && linkNamePairs.length > 0 && (() => {
        // Filter out proposals that are already linked
        // existingLinks is LinksByConceptResult with { outgoing: [], incoming: [] }
        const existingTargetIds = new Set<string>();
        if (existingLinks && typeof existingLinks === 'object') {
          const links = existingLinks as { outgoing?: any[]; incoming?: any[] };
          if (Array.isArray(links.outgoing)) {
            links.outgoing.forEach((l: any) => {
              const targetId = l.targetId || l.target?.id;
              if (targetId) existingTargetIds.add(targetId);
            });
          }
          if (Array.isArray(links.incoming)) {
            links.incoming.forEach((l: any) => {
              const sourceId = l.sourceId || l.source?.id;
              if (sourceId) existingTargetIds.add(sourceId);
            });
          }
        }
        const filteredProposals = proposals.filter((p: any) => {
          // Proposal structure: { source: string, target: string (concept ID), ... }
          const targetId = p.target;
          return targetId && !existingTargetIds.has(targetId);
        });
        
        if (filteredProposals.length === 0) {
          return (
            <div className="mt-4 text-gray-600">
              All proposals have been linked. Click "Propose Links" again to get new proposals.
            </div>
          );
        }
        
        return (
          <div className="space-y-4 mt-4">
            <h3 className="font-semibold">Proposed Links:</h3>
            {filteredProposals.map((proposal, index) => (
              <LinkProposalCard
                key={index}
                proposal={proposal}
                linkNamePairs={linkNamePairs}
                onConfirm={handleConfirm}
                isCreatingLink={createLinkMutation.isLoading}
              />
            ))}
          </div>
        );
      })()}
      {proposals && Array.isArray(proposals) && proposals.length > 0 && (!linkNamePairs || !Array.isArray(linkNamePairs) || linkNamePairs.length === 0) && (
        <div className="mt-4 text-yellow-600">
          Warning: No link name pairs available. Please create link name pairs first.
        </div>
      )}
    </div>
  );
}

interface LinkProposalCardProps {
  proposal: {
    source: string;
    target: string;
    target_title: string;
    forward_name: string;
    confidence: number;
    reasoning: string;
  };
  linkNamePairs: Array<{
    id: string;
    forwardName: string;
    reverseName: string;
    isSymmetric: boolean;
  }>;
  onConfirm: (targetId: string, linkNameId: string) => void;
  isCreatingLink: boolean;
}

function LinkProposalCard({
  proposal,
  linkNamePairs,
  onConfirm,
  isCreatingLink,
}: LinkProposalCardProps) {
  // Find a matching LinkName pair based on the proposed forward_name, or default to first pair
  const defaultPair = (linkNamePairs && Array.isArray(linkNamePairs)) 
    ? linkNamePairs.find(
        (p) => p?.forwardName?.toLowerCase() === proposal.forward_name?.toLowerCase(),
      ) || linkNamePairs[0]
    : null;

  const [selectedLinkNameId, setSelectedLinkNameId] = useState(
    defaultPair?.id || (linkNamePairs && Array.isArray(linkNamePairs) && linkNamePairs[0]?.id) || "",
  );

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h4 className="font-semibold">Link to: {proposal.target_title}</h4>
          <div
            className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-1 ${
              proposal.confidence >= 0.8
                ? "bg-green-100 text-green-800"
                : proposal.confidence >= 0.6
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            {Math.round(proposal.confidence * 100)}% confidence
          </div>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Link Name Pair:
        </label>
        <select
          value={selectedLinkNameId}
          onChange={(e) => setSelectedLinkNameId(e.target.value)}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        {selectedLinkNameId && linkNamePairs && Array.isArray(linkNamePairs) && (
          <div className="mt-2 text-sm text-gray-600">
            <div>
              Forward: <strong>{linkNamePairs.find((p) => p?.id === selectedLinkNameId)?.forwardName || "unknown"}</strong>
            </div>
            <div>
              Reverse: <strong>{linkNamePairs.find((p) => p?.id === selectedLinkNameId)?.reverseName || "unknown"}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-3 rounded mb-5">
        <p className="text-sm text-gray-700">
          <strong>Reasoning:</strong> {proposal.reasoning}
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => {
            if (selectedLinkNameId && proposal.target) {
              onConfirm(proposal.target, selectedLinkNameId);
            } else {
              console.error("Cannot confirm link: missing linkNameId or targetId", { selectedLinkNameId, targetId: proposal.target });
            }
          }}
          disabled={!selectedLinkNameId || !proposal.target || isCreatingLink}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title={!selectedLinkNameId ? "Please select a link name pair" : !proposal.target ? "Missing target concept" : ""}
        >
          {isCreatingLink && <LoadingSpinner size="sm" />}
          <span>{isCreatingLink ? "Confirming..." : "Confirm Link"}</span>
        </button>
      </div>
    </div>
  );
}

