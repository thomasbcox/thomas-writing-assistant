"use client";

import { useState } from "react";
import { api } from "~/lib/trpc/react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { useTimer } from "~/hooks/useTimer";

interface LinkProposerProps {
  conceptId: string;
  conceptTitle: string;
}

export function LinkProposer({ conceptId, conceptTitle }: LinkProposerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const utils = api.useUtils();
  const { elapsedSeconds, formattedTime, showCounter } = useTimer(isLoading);

  const { data: linkNamePairs, error: linkNamePairsError } = api.linkName.getAll.useQuery();
  
  if (linkNamePairsError) {
    console.error("Error loading link name pairs:", linkNamePairsError);
  }

  const createLinkMutation = api.link.create.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      void utils.link.getByConcept.invalidate({ conceptId });
      void utils.link.getAll.invalidate();
    },
  });

  const { data: proposals, refetch, error: proposalsError } = api.concept.proposeLinks.useQuery(
    { conceptId, maxProposals: 5 },
    { enabled: false },
  );
  
  if (proposalsError) {
    console.error("Error loading link proposals:", proposalsError);
  }

  const handlePropose = async () => {
    setIsLoading(true);
    await refetch();
    setIsLoading(false);
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

      {proposals && Array.isArray(proposals) && proposals.length > 0 && linkNamePairs && Array.isArray(linkNamePairs) && linkNamePairs.length > 0 && (
        <div className="space-y-4 mt-4">
          <h3 className="font-semibold">Proposed Links:</h3>
          {proposals.map((proposal, index) => (
            <LinkProposalCard
              key={index}
              proposal={proposal}
              linkNamePairs={linkNamePairs}
              onConfirm={handleConfirm}
              isCreatingLink={createLinkMutation.isPending}
            />
          ))}
        </div>
      )}
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
        >
          {isCreatingLink && <LoadingSpinner size="sm" />}
          <span>{isCreatingLink ? "Confirming..." : "Confirm Link"}</span>
        </button>
      </div>
    </div>
  );
}

