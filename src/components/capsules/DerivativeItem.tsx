"use client";

import { useState } from "react";
import type { RepurposedContent } from "~/types/database";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface DerivativeItemProps {
  item: RepurposedContent;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  rows?: number;
}

export function DerivativeItem({
  item,
  onUpdate,
  onDelete,
  isUpdating = false,
  isDeleting = false,
  rows = 4,
}: DerivativeItemProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>(item.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const handleSave = () => {
    onUpdate(item.id, editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(item.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(item.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="p-3 bg-white border border-gray-200 rounded">
        {item.guidance && (
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs font-medium text-blue-600 italic">
              Guidance: {item.guidance}
            </p>
          </div>
        )}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={rows}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.content}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setEditContent(item.content);
                  setIsEditing(true);
                }}
                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Derivative"
        message="Are you sure you want to delete this derivative? This action cannot be undone."
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

