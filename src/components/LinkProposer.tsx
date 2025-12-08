"use client";

import { useState } from "react";
import { api } from "~/lib/trpc/react";

interface LinkProposerProps {
  conceptId: string;
  conceptTitle: string;
}

export function LinkProposer({ conceptId, conceptTitle }: LinkProposerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { data: linkNames } = api.linkName.getAll.useQuery();

  const createLinkMutation = api.link.create.useMutation({
    onSuccess: () => {
      // Link created successfully
    },
  });

  const { data: proposals, refetch } = api.concept.proposeLinks.useQuery(
    { conceptId, maxProposals: 5 },
    { enabled: false },
  );

  const handlePropose = async () => {
    setIsLoading(true);
    await refetch();
    setIsLoading(false);
  };

  const handleConfirm = (
    targetId: string,
    forwardName: string,
    reverseName?: string,
  ) => {
    createLinkMutation.mutate({
      sourceId: conceptId,
      targetId,
      forwardName,
      reverseName,
    });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handlePropose}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Proposing..." : "Propose Links"}
      </button>

      {proposals && proposals.length > 0 && (
        <div className="space-y-4 mt-4">
          <h3 className="font-semibold">Proposed Links:</h3>
          {proposals.map((proposal, index) => (
            <LinkProposalCard
              key={index}
              proposal={proposal}
              linkNames={linkNames ?? []}
              onConfirm={handleConfirm}
            />
          ))}
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
  linkNames: string[];
  onConfirm: (targetId: string, forwardName: string, reverseName?: string) => void;
}

function LinkProposalCard({
  proposal,
  linkNames,
  onConfirm,
}: LinkProposalCardProps) {
  const [forwardName, setForwardName] = useState(proposal.forward_name);
  const [reverseName, setReverseName] = useState("");

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
        <label className="block text-sm font-medium text-gray-700 mb-5">
          Forward Name (from source to target):
        </label>
        <select
          value={forwardName}
          onChange={(e) => setForwardName(e.target.value)}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {linkNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-5">
          Reverse Name (from target to source, optional):
        </label>
        <select
          value={reverseName}
          onChange={(e) => setReverseName(e.target.value)}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">(Same as forward name)</option>
          {linkNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-blue-50 p-3 rounded mb-5">
        <p className="text-sm text-gray-700">
          <strong>Reasoning:</strong> {proposal.reasoning}
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={() =>
            onConfirm(proposal.target, forwardName, reverseName || undefined)
          }
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Confirm Link
        </button>
      </div>
    </div>
  );
}

