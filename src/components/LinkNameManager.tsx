"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { InputDialog } from "./ui/InputDialog";

interface LinkNamePair {
  id: string;
  forwardName: string;
  reverseName: string;
  isSymmetric: boolean;
  isDefault: boolean;
  isDeleted: boolean;
}

export function LinkNameManager() {
  const [newForwardName, setNewForwardName] = useState("");
  const [newReverseName, setNewReverseName] = useState("");
  const [isSymmetric, setIsSymmetric] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [editingPair, setEditingPair] = useState<LinkNamePair | null>(null);
  const [deletingPair, setDeletingPair] = useState<LinkNamePair | null>(null);
  const [replacingPair, setReplacingPair] = useState<{ pair: LinkNamePair; usageCount: number } | null>(null);

  const { data: linkNames, refetch } = api.linkName.getAll.useQuery();

  const createMutation = api.linkName.create.useMutation({
    onSuccess: () => {
      setNewForwardName("");
      setNewReverseName("");
      setIsSymmetric(false);
      refetch();
    },
  });

  const updateMutation = api.linkName.update.useMutation({
    onSuccess: () => {
      setEditingPair(null);
      refetch();
    },
  });

  const deleteMutation = api.linkName.delete.useMutation({
    onSuccess: () => {
      setDeletingPair(null);
      setReplacingPair(null);
      refetch();
    },
  });

  const handleCreate = () => {
    if (newForwardName.trim()) {
      createMutation.mutate({
        forwardName: newForwardName.trim(),
        reverseName: isSymmetric ? undefined : newReverseName.trim() || undefined,
      });
    }
  };

  const handleUpdate = (pair: LinkNamePair) => {
    if (pair && pair.id) {
      setEditingPair(pair);
    } else {
      console.error("Cannot update: invalid link name pair", pair);
    }
  };

  const handleDelete = async (pair: LinkNamePair) => {
    if (!pair || !pair.id) {
      console.error("Cannot delete: invalid link name pair", pair);
      return;
    }
    
    try {
      const { data: usage } = await api.linkName.getUsage.useQuery({ id: pair.id });
      const usageCount = usage?.count ?? 0;

      if (usageCount > 0) {
        setReplacingPair({ pair, usageCount });
      } else {
        setDeletingPair(pair);
      }
    } catch (error) {
      console.error("Error checking link name usage:", error);
      // Still allow deletion attempt
      setDeletingPair(pair);
    }
  };

  const handleUpdateConfirm = (forward: string, reverse: string) => {
    if (editingPair && forward.trim()) {
      updateMutation.mutate({
        id: editingPair.id,
        forwardName: forward.trim(),
        reverseName: reverse.trim() || undefined,
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingPair) {
      deleteMutation.mutate({ id: deletingPair.id });
    }
  };

  const handleReplaceConfirm = (replaceWithId: string) => {
    if (replacingPair && replaceWithId) {
      deleteMutation.mutate({
        id: replacingPair.pair.id,
        replaceWithId: replaceWithId,
      });
    }
    setReplacingPair(null);
  };

  const filteredPairs = (linkNames || []).filter((pair) => {
    const searchLower = searchFilter.toLowerCase();
    return (
      pair.forwardName?.toLowerCase().includes(searchLower) ||
      pair.reverseName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Create new link name pair */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900">Create New Link Name Pair</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forward Name (required)
            </label>
            <input
              type="text"
              value={newForwardName}
              onChange={(e) => setNewForwardName(e.target.value)}
              placeholder="e.g., references"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reverse Name {isSymmetric ? "(same as forward)" : "(optional)"}
            </label>
            <input
              type="text"
              value={newReverseName}
              onChange={(e) => setNewReverseName(e.target.value)}
              disabled={isSymmetric}
              placeholder={isSymmetric ? "Auto-filled" : "e.g., referenced by"}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="symmetric"
            checked={isSymmetric}
            onChange={(e) => {
              setIsSymmetric(e.target.checked);
              if (e.target.checked) {
                setNewReverseName(newForwardName);
              }
            }}
            className="w-4 h-4"
          />
          <label htmlFor="symmetric" className="text-sm text-gray-700">
            Symmetric (same name both directions)
          </label>
        </div>
        <button
          onClick={handleCreate}
          disabled={!newForwardName.trim() || createMutation.isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isLoading ? "Creating..." : "Create Pair"}
        </button>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Search link name pairs..."
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-5"
        />
      </div>

      {/* List of link name pairs */}
      <div className="space-y-2">
        {Array.isArray(filteredPairs) && filteredPairs.length > 0 ? (
          filteredPairs.map((pair) => (
            <LinkNameItem
              key={pair.id}
              pair={pair}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <p className="text-gray-500 text-sm">No link name pairs found.</p>
        )}
      </div>

      {/* Edit dialog */}
      {editingPair && (
        <LinkNameEditDialog
          pair={editingPair}
          onConfirm={handleUpdateConfirm}
          onCancel={() => setEditingPair(null)}
        />
      )}

      {/* Delete confirmation */}
      {deletingPair && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Link Name Pair"
          message={`Are you sure you want to delete "${deletingPair.forwardName}" → "${deletingPair.reverseName}"?`}
          confirmText="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingPair(null)}
          variant="danger"
        />
      )}

      {/* Replace dialog */}
      {replacingPair && (
        <LinkNameReplaceDialog
          pair={replacingPair.pair}
          usageCount={replacingPair.usageCount}
          availablePairs={linkNames?.filter((p) => p.id !== replacingPair.pair.id) || []}
          onConfirm={handleReplaceConfirm}
          onCancel={() => setReplacingPair(null)}
        />
      )}
    </div>
  );
}

interface LinkNameItemProps {
  pair: LinkNamePair;
  onUpdate: (pair: LinkNamePair) => void;
  onDelete: (pair: LinkNamePair) => void;
}

function LinkNameItem({ pair, onUpdate, onDelete }: LinkNameItemProps) {
  const { data: usage, error: usageError } = api.linkName.getUsage.useQuery({ id: pair.id });

  if (usageError) {
    console.error("Error loading link name usage:", usageError);
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
      <div>
        <div className="font-medium">
          <span className="text-blue-600">{pair?.forwardName || "unknown"}</span>
          <span className="mx-2 text-gray-400">→</span>
          <span className="text-purple-600">{pair?.reverseName || "unknown"}</span>
          {pair?.isSymmetric && (
            <span className="ml-2 text-xs text-gray-500">(symmetric)</span>
          )}
          {pair?.isDefault && (
            <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">default</span>
          )}
        </div>
        {usage && typeof usage.count === "number" && (
          <span className="text-sm text-gray-500">
            Used in {usage.count} link{usage.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onUpdate(pair)}
          className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(pair)}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface LinkNameEditDialogProps {
  pair: LinkNamePair;
  onConfirm: (forward: string, reverse: string) => void;
  onCancel: () => void;
}

function LinkNameEditDialog({ pair, onConfirm, onCancel }: LinkNameEditDialogProps) {
  const [forward, setForward] = useState(pair.forwardName);
  const [reverse, setReverse] = useState(pair.reverseName);
  const [isSymmetric, setIsSymmetric] = useState(pair.isSymmetric);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Edit Link Name Pair</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forward Name
            </label>
            <input
              type="text"
              value={forward}
              onChange={(e) => {
                setForward(e.target.value);
                if (isSymmetric) {
                  setReverse(e.target.value);
                }
              }}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reverse Name
            </label>
            <input
              type="text"
              value={reverse}
              onChange={(e) => setReverse(e.target.value)}
              disabled={isSymmetric}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-symmetric"
              checked={isSymmetric}
              onChange={(e) => {
                setIsSymmetric(e.target.checked);
                if (e.target.checked) {
                  setReverse(forward);
                }
              }}
              className="w-4 h-4"
            />
            <label htmlFor="edit-symmetric" className="text-sm text-gray-700">
              Symmetric
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(forward, reverse)}
              disabled={!forward.trim()}
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

interface LinkNameReplaceDialogProps {
  pair: LinkNamePair;
  usageCount: number;
  availablePairs: LinkNamePair[];
  onConfirm: (replaceWithId: string) => void;
  onCancel: () => void;
}

function LinkNameReplaceDialog({
  pair,
  usageCount,
  availablePairs,
  onConfirm,
  onCancel,
}: LinkNameReplaceDialogProps) {
  const [selectedId, setSelectedId] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Replace Link Name Pair</h2>
        <p className="text-sm text-gray-700 mb-4">
          "{pair?.forwardName || "unknown"}" → "{pair?.reverseName || "unknown"}" is used in {usageCount || 0} link(s).
          Select a replacement:
        </p>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        >
          <option value="">-- Select replacement --</option>
          {availablePairs && Array.isArray(availablePairs) && availablePairs.length > 0 ? (
            availablePairs.map((p) => (
              <option key={p?.id || ""} value={p?.id || ""}>
                {p?.forwardName || "unknown"} → {p?.reverseName || "unknown"}
              </option>
            ))
          ) : (
            <option value="" disabled>No replacement pairs available</option>
          )}
        </select>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedId)}
            disabled={!selectedId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}

