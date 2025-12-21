"use client";

import type { CapsuleWithAnchors } from "~/types/database";
import { CapsuleCard } from "./CapsuleCard";

interface CapsuleListProps {
  capsules: CapsuleWithAnchors[] | undefined;
  expandedCapsules: Set<string>;
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

export function CapsuleList({
  capsules,
  expandedCapsules,
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
}: CapsuleListProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-5">Capsules</h2>
      <div className="space-y-4">
        {Array.isArray(capsules) && capsules.map((capsule) => (
          <CapsuleCard
            key={capsule.id}
            capsule={capsule}
            isExpanded={expandedCapsules.has(capsule.id)}
            selectedAnchorId={selectedAnchorId}
            onToggleExpand={onToggleExpand}
            onSelectAnchor={onSelectAnchor}
            onEditAnchor={onEditAnchor}
            onDeleteAnchor={onDeleteAnchor}
            onRegenerateDerivatives={onRegenerateDerivatives}
            onUpdateDerivative={onUpdateDerivative}
            onDeleteDerivative={onDeleteDerivative}
            isDeletingAnchor={isDeletingAnchor}
            isRegenerating={isRegenerating}
            isUpdatingDerivative={isUpdatingDerivative}
            isDeletingDerivative={isDeletingDerivative}
          />
        ))}
      </div>
    </div>
  );
}

