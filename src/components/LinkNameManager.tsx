"use client";

import { useState } from "react";
import { api } from "~/lib/trpc/react";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { InputDialog } from "./ui/InputDialog";

export function LinkNameManager() {
  const [newName, setNewName] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [replacingName, setReplacingName] = useState<{ name: string; usageCount: number } | null>(null);

  const { data: linkNames, refetch } = api.linkName.getAll.useQuery();

  const createMutation = api.linkName.create.useMutation({
    onSuccess: () => {
      setNewName("");
      refetch();
    },
  });

  const updateMutation = api.linkName.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteMutation = api.linkName.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreate = () => {
    if (newName.trim()) {
      createMutation.mutate({ name: newName.trim() });
    }
  };

  const handleUpdate = (oldName: string) => {
    setEditingName(oldName);
  };

  const handleDelete = async (name: string) => {
    const { data: usage } = await api.linkName.getUsage.useQuery({ name });
    const usageCount = usage?.count ?? 0;

    if (usageCount > 0) {
      setReplacingName({ name, usageCount });
    } else {
      setDeletingName(name);
    }
  };

  const handleUpdateConfirm = (newNameValue: string) => {
    if (editingName && newNameValue.trim()) {
      updateMutation.mutate({
        oldName: editingName,
        newName: newNameValue.trim(),
      });
    }
    setEditingName(null);
  };

  const handleDeleteConfirm = () => {
    if (deletingName) {
      deleteMutation.mutate({ name: deletingName });
      setDeletingName(null);
    }
  };

  const handleReplaceConfirm = (replaceWith: string) => {
    if (replacingName && replaceWith.trim()) {
      deleteMutation.mutate({
        name: replacingName.name,
        replaceWith: replaceWith.trim(),
      });
    }
    setReplacingName(null);
  };

  const filteredNames = linkNames?.filter((name) =>
    name.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New link name"
          className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleCreate();
            }
          }}
        />
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Name
        </button>
      </div>

      <div>
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Search link names..."
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-5"
        />
      </div>

      <div className="space-y-2">
        {filteredNames?.map((name) => (
          <LinkNameItem
            key={name}
            name={name}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {editingName && (
        <InputDialog
          isOpen={true}
          title="Rename Link Name"
          message={`Rename "${editingName}" to:`}
          placeholder="New name"
          defaultValue={editingName}
          confirmText="Rename"
          onConfirm={handleUpdateConfirm}
          onCancel={() => setEditingName(null)}
        />
      )}

      {deletingName && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Link Name"
          message={`Are you sure you want to delete "${deletingName}"?`}
          confirmText="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingName(null)}
          variant="danger"
        />
      )}

      {replacingName && (
        <InputDialog
          isOpen={true}
          title="Replace Link Name"
          message={`"${replacingName.name}" is used in ${replacingName.usageCount} link(s). Enter replacement name:`}
          placeholder="Replacement name"
          confirmText="Replace"
          onConfirm={handleReplaceConfirm}
          onCancel={() => setReplacingName(null)}
        />
      )}
    </div>
  );
}

interface LinkNameItemProps {
  name: string;
  onUpdate: (name: string) => void;
  onDelete: (name: string) => void;
}

function LinkNameItem({ name, onUpdate, onDelete }: LinkNameItemProps) {
  const { data: usage } = api.linkName.getUsage.useQuery({ name });

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
      <div>
        <span className="font-medium">{name}</span>
        {usage && (
          <span className="ml-2 text-sm text-gray-500">
            ({usage.count} link{usage.count !== 1 ? "s" : ""})
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onUpdate(name)}
          className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(name)}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

