"use client";

import { useState, useCallback } from "react";
import { api } from "~/lib/trpc/react";
import { ToastContainer, type ToastType } from "./ui/Toast";
import { AnchorEditor } from "./AnchorEditor";
import { CapsuleInfoSection } from "./capsules/CapsuleInfoSection";
import { PDFUploadSection } from "./capsules/PDFUploadSection";
import { CreateCapsuleForm } from "./capsules/CreateCapsuleForm";
import { CapsuleList } from "./capsules/CapsuleList";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function CapsulesTab() {
  // Load full data with all nested relations for detailed view
  // #region agent log
  (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'CapsulesTab.tsx:20',message:'About to call useQuery',data:{hasApi:!!api,apiType:typeof api,hasCapsule:!!api?.capsule,hasList:!!api?.capsule?.list,hasUseQuery:!!api?.capsule?.list?.useQuery,useQueryType:typeof api?.capsule?.list?.useQuery,isMock:!!api?.capsule?.list?.useQuery?.mockImplementation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})+"\n"); } catch {} })();
  // #endregion
  // #region agent log
  (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'CapsulesTab.tsx:20',message:'About to call useQuery - H2',data:{apiSource:api?.constructor?.name,isProxy:api?.[Symbol.toStringTag]==='Proxy'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})+"\n"); } catch {} })();
  // #endregion
  const { data: capsules, refetch } = api.capsule.list.useQuery({ summary: false });
  // #region agent log
  (async () => { try { const fs = await import("fs"); fs.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({location:'CapsulesTab.tsx:22',message:'After useQuery call',data:{hasData:!!data,hasCapsules:!!capsules,hasRefetch:!!refetch},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})+"\n"); } catch {} })();
  // #endregion
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Clear all tab state (refetch to reset any local state)
  const handleClear = () => {
    // Clear local state
    setExpandedCapsules(new Set());
    setSelectedAnchorId(null);
    setEditingAnchorId(null);
    // Refetch data
    void refetch();
    addToast("Tab cleared", "success");
  };

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const [expandedCapsules, setExpandedCapsules] = useState<Set<string>>(new Set());
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [editingAnchorId, setEditingAnchorId] = useState<string | null>(null);

  const regenerateMutation = api.capsule.regenerateRepurposedContent.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedAnchorId(null);
      addToast("Derivatives regenerated successfully", "success");
    },
    onError: (error) => {
      addToast(error.message || "Failed to regenerate derivatives", "error");
    },
  });

  const updateAnchorMutation = api.capsule.updateAnchor.useMutation({
    onSuccess: () => {
      refetch();
      setEditingAnchorId(null);
      addToast("Anchor updated successfully", "success");
    },
    onError: (error) => {
      addToast(error.message || "Failed to update anchor", "error");
    },
  });

  const deleteAnchorMutation = api.capsule.deleteAnchor.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedAnchorId(null);
      addToast("Anchor deleted successfully", "success");
    },
    onError: (error) => {
      addToast(error.message || "Failed to delete anchor", "error");
    },
  });

  const updateDerivativeMutation = api.capsule.updateRepurposedContent.useMutation({
    onSuccess: () => {
      refetch();
      addToast("Derivative updated successfully", "success");
    },
    onError: (error) => {
      addToast(error.message || "Failed to update derivative", "error");
    },
  });

  const deleteDerivativeMutation = api.capsule.deleteRepurposedContent.useMutation({
    onSuccess: () => {
      refetch();
      addToast("Derivative deleted successfully", "success");
    },
    onError: (error) => {
      addToast(error.message || "Failed to delete derivative", "error");
    },
  });

  const handleToggleExpand = useCallback((capsuleId: string) => {
    setExpandedCapsules((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(capsuleId)) {
        newExpanded.delete(capsuleId);
        setSelectedAnchorId(null);
      } else {
        newExpanded.add(capsuleId);
      }
      return newExpanded;
    });
  }, []);

  const handleSelectAnchor = useCallback((anchorId: string | null) => {
    setSelectedAnchorId(anchorId);
  }, []);

  const handleEditAnchor = useCallback((anchorId: string) => {
    setEditingAnchorId(anchorId);
  }, []);

  const handleDeleteAnchor = useCallback((anchorId: string) => {
    deleteAnchorMutation.mutate({ id: anchorId });
  }, [deleteAnchorMutation]);

  const handleRegenerateDerivatives = useCallback((anchorId: string) => {
    regenerateMutation.mutate({ anchorId });
  }, [regenerateMutation]);

  const handleUpdateDerivative = useCallback((id: string, content: string) => {
    updateDerivativeMutation.mutate({ id, content });
  }, [updateDerivativeMutation]);

  const handleDeleteDerivative = useCallback((id: string) => {
    deleteDerivativeMutation.mutate({ id });
  }, [deleteDerivativeMutation]);

  const handlePDFSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePDFError = useCallback((message: string) => {
    addToast(message, "error");
  }, [addToast]);

  const handleCapsuleCreateSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="flex justify-end mb-2">
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
          title="Clear all selections and refresh tab"
        >
          Clear
        </button>
      </div>
      <div className="space-y-5">
        <CapsuleInfoSection />

        <PDFUploadSection
          capsules={capsules}
          onSuccess={handlePDFSuccess}
          onError={handlePDFError}
        />

        <CreateCapsuleForm onSuccess={handleCapsuleCreateSuccess} />

        <CapsuleList
          capsules={capsules}
          expandedCapsules={expandedCapsules}
          selectedAnchorId={selectedAnchorId}
          onToggleExpand={handleToggleExpand}
          onSelectAnchor={handleSelectAnchor}
          onEditAnchor={handleEditAnchor}
          onDeleteAnchor={handleDeleteAnchor}
          onRegenerateDerivatives={handleRegenerateDerivatives}
          onUpdateDerivative={handleUpdateDerivative}
          onDeleteDerivative={handleDeleteDerivative}
          isDeletingAnchor={deleteAnchorMutation.isPending}
          isRegenerating={regenerateMutation.isPending}
          isUpdatingDerivative={updateDerivativeMutation.isPending}
          isDeletingDerivative={deleteDerivativeMutation.isPending}
        />

        {editingAnchorId && (
          <AnchorEditor
            anchorId={editingAnchorId}
            onClose={() => setEditingAnchorId(null)}
            onSave={() => {
              refetch();
              setEditingAnchorId(null);
            }}
          />
        )}
      </div>
    </>
  );
}
