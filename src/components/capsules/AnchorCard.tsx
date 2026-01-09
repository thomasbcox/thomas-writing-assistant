"use client";

import { useState } from "react";
import type { AnchorWithRepurposed } from "~/types/database";
import { safeJsonParseArray } from "~/lib/json-utils";
import { DerivativeList } from "./DerivativeList";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useTimer } from "~/hooks/useTimer";

interface AnchorCardProps {
  anchor: AnchorWithRepurposed;
  isSelected: boolean;
  onSelect: (anchorId: string | null) => void;
  onEdit: (anchorId: string) => void;
  onDelete: (anchorId: string) => void;
  onRegenerate: (anchorId: string) => void;
  onUpdateDerivative: (id: string, content: string) => void;
  onDeleteDerivative: (id: string) => void;
  isDeleting?: boolean;
  isRegenerating?: boolean;
  isUpdatingDerivative?: boolean;
  isDeletingDerivative?: boolean;
}

export function AnchorCard({
  anchor,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onRegenerate,
  onUpdateDerivative,
  onDeleteDerivative,
  isDeleting = false,
  isRegenerating = false,
  isUpdatingDerivative = false,
  isDeletingDerivative = false,
}: AnchorCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState<boolean>(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState<boolean>(false);

  const repurposedCount = anchor.repurposedContent?.length ?? 0;
  const painPoints = safeJsonParseArray<string>(anchor.painPoints, []);
  const { formattedTime, showCounter } = useTimer(isRegenerating);

  return (
    <>
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{anchor.title}</h4>
            {Array.isArray(painPoints) && painPoints.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-700">Pain Points:</p>
                <ul className="text-xs text-gray-600 mt-1">
                  {painPoints.slice(0, 2).map((p: string, i: number) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {repurposedCount} derivative{repurposedCount !== 1 ? "s" : ""} generated
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onSelect(isSelected ? null : anchor.id)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isSelected ? "Hide" : "View"} Derivatives
            </button>
            <button
              onClick={() => onEdit(anchor.id)}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              Delete
            </button>
            {repurposedCount > 0 && (
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                disabled={isRegenerating}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRegenerating && <LoadingSpinner size="sm" />}
                <span>
                  {isRegenerating 
                    ? `Regenerating${showCounter ? ` (${formattedTime})` : "..."}` 
                    : "Regenerate"}
                </span>
              </button>
            )}
          </div>
        </div>

        {isSelected && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {repurposedCount === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">No derivatives generated yet.</p>
                <button
                  onClick={() => setShowGenerateConfirm(true)}
                  disabled={isRegenerating}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRegenerating && <LoadingSpinner size="sm" />}
                  <span>
                    {isRegenerating 
                      ? `Generating${showCounter ? ` (${formattedTime})` : "..."}` 
                      : "Generate Derivatives"}
                  </span>
                </button>
              </div>
            ) : (
              <DerivativeList
                derivatives={anchor.repurposedContent ?? []}
                onUpdate={onUpdateDerivative}
                onDelete={onDeleteDerivative}
                isUpdating={isUpdatingDerivative}
                isDeleting={isDeletingDerivative}
              />
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Anchor"
        message="Are you sure you want to delete this anchor? This will also delete all associated derivatives. This action cannot be undone."
        variant="danger"
        onConfirm={() => {
          onDelete(anchor.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showRegenerateConfirm}
        title="Regenerate Derivatives"
        message="Regenerate all derivatives for this anchor? This will replace existing content."
        variant="default"
        onConfirm={() => {
          setShowRegenerateConfirm(false);
          onRegenerate(anchor.id);
        }}
        onCancel={() => setShowRegenerateConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showGenerateConfirm}
        title="Generate Derivatives"
        message="Generate derivatives for this anchor?"
        variant="default"
        onConfirm={() => {
          setShowGenerateConfirm(false);
          onRegenerate(anchor.id);
        }}
        onCancel={() => setShowGenerateConfirm(false)}
      />
    </>
  );
}

