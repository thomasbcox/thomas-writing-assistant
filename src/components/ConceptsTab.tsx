"use client";

import { useState, useCallback } from "react";
import { api } from "~/lib/trpc/react";
import { ConceptEditor } from "./ConceptEditor";
import { ConceptViewer } from "./ConceptViewer";
import { ToastContainer } from "./ui/Toast";
import { ContextualHelp } from "./ui/ContextualHelp";
import { useErrorHandler } from "~/hooks/useErrorHandler";
import type { ConceptListItem } from "~/types/database";
import { ConceptCreateForm } from "./ConceptCreateForm";
import { ConceptList } from "./ConceptList";
import { ConceptActions } from "./ConceptActions";
import { ConfirmDialog } from "./ui/ConfirmDialog";

export function ConceptsTab() {
  const [search, setSearch] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [showCreateConceptForm, setShowCreateConceptForm] = useState<boolean>(false);

  const { handleError, showSuccess, toasts, removeToast } = useErrorHandler();

  const {
    data: concepts,
    isLoading: conceptsLoading,
    error: conceptsError,
    refetch,
  } = api.concept.list.useQuery({
    includeTrash: showTrash,
    search: search || undefined,
  });

  const createMutation = api.concept.create.useMutation({
    onSuccess: () => {
      refetch();
      showSuccess("Concept created successfully");
      setShowCreateConceptForm(false);
    },
    onError: (error) => {
      handleError(error, {
        context: { operation: "create concept" },
        recovery: async () => {
          await refetch();
        },
      });
    },
  });

  const deleteMutation = api.concept.delete.useMutation({
    onSuccess: () => {
      refetch();
      showSuccess("Concept deleted successfully");
      setDeleteConfirm(null);
    },
    onError: (error) => {
      handleError(error, {
        context: { operation: "delete concept" },
        recovery: async () => {
          await refetch();
        },
      });
      setDeleteConfirm(null);
    },
  });

  const restoreMutation = api.concept.restore.useMutation({
    onSuccess: () => {
      refetch();
      showSuccess("Concept restored successfully");
    },
    onError: (error) => {
      handleError(error, {
        context: { operation: "restore concept" },
        recovery: async () => {
          await refetch();
        },
      });
    },
  });

  const purgeMutation = api.concept.purgeTrash.useMutation({
    onSuccess: () => {
      refetch();
      showSuccess("Trash purged successfully");
      setPurgeConfirm(false);
    },
    onError: (error) => {
      handleError(error, {
        context: { operation: "purge trash" },
        recovery: async () => {
          await refetch();
        },
      });
      setPurgeConfirm(false);
    },
  });

  const { data: viewingConcept } = api.concept.getById.useQuery(
    { id: viewingId ?? "" },
    { enabled: !!viewingId },
  );

  const handleCreateConcept = (data: {
    title: string;
    description: string;
    content: string;
    creator: string;
    source: string;
    year: string;
  }) => {
    createMutation.mutate(data);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">
                Create New Concept
              </h2>
              <ContextualHelp
                title="Creating Concepts"
                content="Concepts are the building blocks of your knowledge base. Each concept represents a core idea, principle, or piece of knowledge. Include a clear title, description for searchability, and full content. Add metadata (creator, source, year) to track where ideas came from."
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateConceptForm(!showCreateConceptForm)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              {showCreateConceptForm ? "Hide Form" : "Show Form"}
            </button>
          </div>
          {showCreateConceptForm && (
            <ConceptCreateForm
              onSubmit={handleCreateConcept}
              isPending={createMutation.isPending}
            />
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Concepts</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search concepts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 w-64"
                />
              </div>
              <ConceptActions
                showTrash={showTrash}
                onToggleTrash={setShowTrash}
                onPurgeTrash={() => purgeMutation.mutate({ daysOld: 30 })}
                purgeConfirm={purgeConfirm}
                onSetPurgeConfirm={setPurgeConfirm}
                isPurging={purgeMutation.isPending}
              />
            </div>
          </div>

          <ConceptList
            concepts={concepts}
            isLoading={conceptsLoading}
            error={conceptsError ? new Error(conceptsError.message) : null}
            showTrash={showTrash}
            onView={(id) => setViewingId(id)}
            onEdit={(id) => setEditingId(id)}
            onDelete={(id) => setDeleteConfirm(id)}
            onRestore={(id) => restoreMutation.mutate({ id })}
          />
        </div>

        {editingId && (
          <ConceptEditor
            conceptId={editingId}
            onClose={() => setEditingId(null)}
            onSave={() => {
              refetch();
              setEditingId(null);
            }}
          />
        )}

        {viewingConcept && (
          <ConceptViewer
            concept={viewingConcept}
            onClose={() => setViewingId(null)}
          />
        )}

        <ConfirmDialog
          isOpen={deleteConfirm !== null}
          title="Delete Concept"
          message="Are you sure you want to delete this concept? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={() => {
            if (deleteConfirm) {
              deleteMutation.mutate({ id: deleteConfirm });
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />

        <ConfirmDialog
          isOpen={purgeConfirm}
          title="Purge Trash"
          message="Are you sure you want to permanently delete all concepts in trash older than 30 days? This action cannot be undone."
          confirmText="Purge"
          cancelText="Cancel"
          variant="danger"
          onConfirm={() => {
            purgeMutation.mutate({ daysOld: 30 });
          }}
          onCancel={() => setPurgeConfirm(false)}
        />
      </div>
    </>
  );
}
