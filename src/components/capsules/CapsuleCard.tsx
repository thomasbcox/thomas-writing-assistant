"use client";

import type { CapsuleWithAnchors } from "~/types/database";
import { AnchorCard } from "./AnchorCard";

interface CapsuleCardProps {
  capsule: CapsuleWithAnchors;
  isExpanded: boolean;
  selectedAnchorId: string | null;
  onToggleExpand: (capsuleId: string) => void;
  onSelectAnchor: (anchorId: string | null) => void;
  onEditAnchor: (anchorId: string) => void;
  onDeleteAnchor: (anchorId: string) => void;
  onRegenerateDerivatives: (anchorId: string) => void;
  onUpdateDerivative: (id: string, content: string) => void;
  onDeleteDerivative: (id: string) => void;
  isDeletingAnchor?: boolean;
  isRegenerating?: boolean;
  isUpdatingDerivative?: boolean;
  isDeletingDerivative?: boolean;
}

export function CapsuleCard({
  capsule,
  isExpanded,
  selectedAnchorId,
  onToggleExpand,
  onSelectAnchor,
  onEditAnchor,
  onDeleteAnchor,
  onRegenerateDerivatives,
  onUpdateDerivative,
  onDeleteDerivative,
  isDeletingAnchor = false,
  isRegenerating = false,
  isUpdatingDerivative = false,
  isDeletingDerivative = false,
}: CapsuleCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{capsule.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{capsule.promise}</p>
          <p className="text-sm text-gray-500 mt-1">CTA: {capsule.cta}</p>
          <p className="text-sm text-gray-500 mt-2">
            {capsule.anchors.length} anchor{capsule.anchors.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => onToggleExpand(capsule.id)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t pt-4">
          {capsule.anchors.length === 0 ? (
            <p className="text-sm text-gray-500">No anchors yet. Upload a PDF to create one.</p>
          ) : (
            capsule.anchors.map((anchor) => (
              <AnchorCard
                key={anchor.id}
                anchor={anchor}
                isSelected={selectedAnchorId === anchor.id}
                onSelect={onSelectAnchor}
                onEdit={onEditAnchor}
                onDelete={onDeleteAnchor}
                onRegenerate={onRegenerateDerivatives}
                onUpdateDerivative={onUpdateDerivative}
                onDeleteDerivative={onDeleteDerivative}
                isDeleting={isDeletingAnchor}
                isRegenerating={isRegenerating}
                isUpdatingDerivative={isUpdatingDerivative}
                isDeletingDerivative={isDeletingDerivative}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

