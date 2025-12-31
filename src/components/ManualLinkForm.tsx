"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";
import { SearchableSelect } from "./ui/SearchableSelect";
import type { ConceptListItem } from "~/types/database";

interface LinkNamePair {
  id: string;
  forwardName: string;
  reverseName: string;
  isSymmetric: boolean;
}

interface ManualLinkFormProps {
  concepts: ConceptListItem[] | undefined;
  linkNamePairs: LinkNamePair[] | undefined;
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

interface FormState {
  sourceId: string;
  targetId: string;
  linkNameId: string;
  notes: string;
}

const initialFormState: FormState = {
  sourceId: "",
  targetId: "",
  linkNameId: "",
  notes: "",
};

export function ManualLinkForm({
  concepts,
  linkNamePairs,
  onSuccess,
  onError,
  onCancel,
}: ManualLinkFormProps) {
  const [formState, setFormState] = useState<FormState>(initialFormState);

  const createLinkMutation = api.link.create.useMutation({
    onSuccess: () => {
      onSuccess();
      setFormState(initialFormState);
    },
    onError: (error) => {
      onError(error.message || "Failed to create link");
    },
  });

  const handleCreateLink = () => {
    if (!formState.sourceId || !formState.targetId || !formState.linkNameId) {
      onError("Please fill in source, target, and link name pair");
      return;
    }
    createLinkMutation.mutate({
      sourceId: formState.sourceId,
      targetId: formState.targetId,
      linkNameId: formState.linkNameId,
      notes: formState.notes || undefined,
    });
  };

  const handleCancel = () => {
    setFormState(initialFormState);
    onCancel();
  };

  const selectedLinkName = linkNamePairs?.find(
    (p) => p?.id === formState.linkNameId
  );

  return (
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
          value={formState.sourceId}
          onChange={(value) =>
            setFormState({ ...formState, sourceId: value })
          }
          placeholder="-- Select source --"
        />
        <SearchableSelect
          label="Target Concept"
          options={
            concepts
              ?.filter((c: ConceptListItem) => c.id !== formState.sourceId)
              .map((c: ConceptListItem) => ({
                value: c.id,
                label: c.title,
              })) ?? []
          }
          value={formState.targetId}
          onChange={(value) =>
            setFormState({ ...formState, targetId: value })
          }
          placeholder="-- Select target --"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Link Name Pair (required)
        </label>
        <select
          value={formState.linkNameId}
          onChange={(e) =>
            setFormState({ ...formState, linkNameId: e.target.value })
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
        {formState.linkNameId && selectedLinkName && (
          <div className="mt-2 text-sm text-gray-600">
            <div>
              Forward: <strong>{selectedLinkName.forwardName || "unknown"}</strong>
            </div>
            <div>
              Reverse: <strong>{selectedLinkName.reverseName || "unknown"}</strong>
            </div>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={formState.notes}
          onChange={(e) =>
            setFormState({ ...formState, notes: e.target.value })
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
          onClick={handleCancel}
          className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all text-base"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

