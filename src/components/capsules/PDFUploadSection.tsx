"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";
import type { CapsuleWithAnchors, AnchorWithRepurposed, RepurposedContent } from "~/types/database";
import { PDFProcessingStatus } from "./PDFProcessingStatus";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useTimer } from "~/hooks/useTimer";

interface PDFUploadSectionProps {
  capsules: CapsuleWithAnchors[] | undefined;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function PDFUploadSection({ capsules, onSuccess, onError }: PDFUploadSectionProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string>("");
  const [createNewCapsule, setCreateNewCapsule] = useState<boolean>(false);
  const [showNewCapsuleForm, setShowNewCapsuleForm] = useState<boolean>(false);
  const [newCapsuleData, setNewCapsuleData] = useState({
    title: "",
    promise: "",
    cta: "",
  });
  const [pdfProcessingStatus, setPdfProcessingStatus] = useState<{
    stage: string;
    result?: {
      anchor: AnchorWithRepurposed;
      repurposedContent: RepurposedContent[];
      metadata: {
        title: string;
        painPoints: string[];
        solutionSteps: string[];
        proof?: string;
      };
    };
  } | null>(null);

  const createCapsuleMutation = api.capsule.create.useMutation();
  const createAnchorFromPDFMutation = api.capsule.createAnchorFromPDF.useMutation({
    onSuccess: (result) => {
      setPdfProcessingStatus({
        stage: "complete",
        result: {
          anchor: result.anchor,
          repurposedContent: result.repurposedContent,
          metadata: result.metadata,
        },
      });
      setPdfFile(null);
      setSelectedCapsuleId("");
      if (createNewCapsule) {
        setNewCapsuleData({ title: "", promise: "", cta: "" });
        setCreateNewCapsule(false);
      }
      onSuccess?.();
    },
    onError: (error) => {
      setPdfProcessingStatus({ stage: "error" });
      onError?.(error.message);
    },
  });

  const isProcessing = createAnchorFromPDFMutation.isLoading || createCapsuleMutation.isLoading;
  const { formattedTime, showCounter } = useTimer(isProcessing);

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setPdfProcessingStatus(null);
    } else {
      onError?.("Please select a PDF file");
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) {
      onError?.("Please select a PDF file");
      return;
    }

    let capsuleId = selectedCapsuleId;

    // If creating a new capsule, create it first
    if (createNewCapsule && showNewCapsuleForm) {
      if (!newCapsuleData.title || !newCapsuleData.promise || !newCapsuleData.cta) {
        onError?.("Please fill in all capsule fields (Title, Promise, CTA)");
        return;
      }

      setPdfProcessingStatus({ stage: "creating_capsule" });

      try {
        const capsule = await createCapsuleMutation.mutateAsync({
          title: newCapsuleData.title,
          promise: newCapsuleData.promise,
          cta: newCapsuleData.cta,
          offerMapping: undefined,
        });
        capsuleId = capsule.id;
      } catch (error) {
        setPdfProcessingStatus({ stage: "error" });
        onError?.(`Error creating capsule: ${error instanceof Error ? error.message : "Unknown error"}`);
        return;
      }
    } else {
      if (!selectedCapsuleId) {
        onError?.("Please select a capsule or choose to create a new one");
        return;
      }
    }

    setPdfProcessingStatus({ stage: "extracting" });

    try {
      // Convert PDF to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(",")[1]; // Remove data:application/pdf;base64, prefix

        setPdfProcessingStatus({ stage: "analyzing" });

        createAnchorFromPDFMutation.mutate({
          capsuleId: capsuleId!,
          fileData: base64Data,
          fileName: pdfFile.name,
          autoRepurpose: true,
        });
      };
      reader.readAsDataURL(pdfFile);
    } catch (error) {
      setPdfProcessingStatus({ stage: "error" });
      onError?.(`Error processing PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-5">Upload PDF as Anchor Post</h2>
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="capsuleOption"
                checked={!createNewCapsule}
                onChange={() => {
                  setCreateNewCapsule(false);
                  setSelectedCapsuleId("");
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Use existing capsule</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="capsuleOption"
                checked={createNewCapsule}
                onChange={() => {
                  setCreateNewCapsule(true);
                  setShowNewCapsuleForm(true);
                  setSelectedCapsuleId("");
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Create new capsule</span>
            </label>
          </div>

          {!createNewCapsule ? (
            <select
              value={selectedCapsuleId}
              onChange={(e) => setSelectedCapsuleId(e.target.value)}
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a capsule --</option>
              {capsules?.map((capsule) => (
                <option key={capsule.id} value={capsule.id}>
                  {capsule.title}
                </option>
              ))}
            </select>
          ) : (
            <>
              {!showNewCapsuleForm ? (
                <button
                  type="button"
                  onClick={() => setShowNewCapsuleForm(true)}
                  className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border-2 border-gray-300"
                >
                  + Create New Capsule
                </button>
              ) : (
                <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      New Capsule Details *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateNewCapsule(false);
                        setNewCapsuleData({ title: "", promise: "", cta: "" });
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capsule Title/Topic *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCapsuleData.title}
                      onChange={(e) =>
                        setNewCapsuleData({ ...newCapsuleData, title: e.target.value })
                      }
                      placeholder="e.g., Productivity Systems"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Promise *
                    </label>
                    <textarea
                      required
                      value={newCapsuleData.promise}
                      onChange={(e) =>
                        setNewCapsuleData({ ...newCapsuleData, promise: e.target.value })
                      }
                      placeholder="What value does this capsule deliver?"
                      rows={2}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CTA (Call-to-Action) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCapsuleData.cta}
                      onChange={(e) =>
                        setNewCapsuleData({ ...newCapsuleData, cta: e.target.value })
                      }
                      placeholder="e.g., Download the free guide"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCapsuleForm(false);
                        setNewCapsuleData({ title: "", promise: "", cta: "" });
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PDF File
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handlePdfFileChange}
            className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {pdfFile && (
            <p className="mt-2 text-sm text-gray-600">Selected: {pdfFile.name}</p>
          )}
        </div>
        <button
          onClick={handlePdfUpload}
          disabled={
            !pdfFile ||
            (!createNewCapsule && !selectedCapsuleId) ||
            (createNewCapsule && (!showNewCapsuleForm || !newCapsuleData.title || !newCapsuleData.promise || !newCapsuleData.cta)) ||
            isProcessing
          }
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing && <LoadingSpinner size="sm" />}
          <span>
            {isProcessing
              ? `Processing${showCounter ? ` (${formattedTime})` : "..."}`
              : "Upload & Generate Derivatives"}
          </span>
        </button>
        <PDFProcessingStatus status={pdfProcessingStatus} />
      </div>
    </div>
  );
}

