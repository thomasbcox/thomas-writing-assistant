"use client";

import { useState, useCallback } from "react";
import { api } from "~/lib/trpc/react";
import { ToastContainer, type ToastType } from "./ui/Toast";
import { translateError } from "~/lib/error-messages";
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
  const { data: capsules, refetch } = api.capsule.list.useQuery();
  const [toasts, setToasts] = useState<Toast[]>([]);

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
      addToast(translateError(error, { operation: "regenerate derivatives" }), "error");
    },
  });

  const updateAnchorMutation = api.capsule.updateAnchor.useMutation({
    onSuccess: () => {
      refetch();
      setEditingAnchorId(null);
      addToast("Anchor updated successfully", "success");
    },
    onError: (error) => {
      addToast(translateError(error, { operation: "update anchor" }), "error");
    },
  });

  const deleteAnchorMutation = api.capsule.deleteAnchor.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedAnchorId(null);
      addToast("Anchor deleted successfully", "success");
    },
    onError: (error) => {
      addToast(translateError(error, { operation: "delete anchor" }), "error");
    },
  });

  const updateDerivativeMutation = api.capsule.updateRepurposedContent.useMutation({
    onSuccess: () => {
      refetch();
      addToast("Derivative updated successfully", "success");
    },
    onError: (error) => {
      addToast(translateError(error, { operation: "update derivative" }), "error");
    },
  });

  const deleteDerivativeMutation = api.capsule.deleteRepurposedContent.useMutation({
    onSuccess: () => {
      refetch();
      addToast("Derivative deleted successfully", "success");
    },
    onError: (error) => {
      addToast(translateError(error, { operation: "delete derivative" }), "error");
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
