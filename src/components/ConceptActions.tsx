"use client";

import { ConfirmDialog } from "./ui/ConfirmDialog";
import { LoadingSpinner } from "./ui/LoadingSpinner";

interface ConceptActionsProps {
  showTrash: boolean;
  onToggleTrash: (show: boolean) => void;
  onPurgeTrash: () => void;
  purgeConfirm: boolean;
  onSetPurgeConfirm: (confirm: boolean) => void;
  isPurging: boolean;
}

export function ConceptActions({
  showTrash,
  onToggleTrash,
  onPurgeTrash,
  purgeConfirm,
  onSetPurgeConfirm,
  isPurging,
}: ConceptActionsProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showTrash}
          onChange={(e) => onToggleTrash(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-900">Show Trash</span>
      </label>
      {showTrash && (
        <button
          onClick={() => onSetPurgeConfirm(true)}
          disabled={isPurging}
          className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isPurging && <LoadingSpinner size="sm" />}
          <span>{isPurging ? "Purging..." : "Purge Old Trash"}</span>
        </button>
      )}
      <ConfirmDialog
        isOpen={purgeConfirm}
        title="Purge Trash"
        message="Are you sure you want to permanently delete all concepts in trash older than 30 days? This action cannot be undone."
        confirmText="Purge"
        onConfirm={() => {
          onPurgeTrash();
          onSetPurgeConfirm(false);
        }}
        onCancel={() => onSetPurgeConfirm(false)}
        variant="danger"
      />
    </div>
  );
}

