"use client";

import { useState } from "react";
import { api } from "~/hooks/useIPC";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import type { ToastType } from "./ui/Toast";

interface PDFUploaderProps {
  onTextExtracted: (text: string, fileName: string) => void;
  onError: (message: string, type: ToastType) => void;
  disabled?: boolean;
}

export function PDFUploader({
  onTextExtracted,
  onError,
  disabled = false,
}: PDFUploaderProps) {
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const pdfExtractMutation = api.pdf.extractText.useMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Handle PDF files
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsProcessingPdf(true);
      setPdfFileName(file.name);
      try {
        // Read file as base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                "",
              ),
            );

            // Extract text from PDF
            const result = await pdfExtractMutation.mutateAsync({
              fileData: base64,
              fileName: file.name,
            });

            setPdfFileName(file.name);
            onTextExtracted(result.text, file.name);
            onError(
              `PDF processed successfully! Extracted ${result.numPages} page${result.numPages !== 1 ? "s" : ""} (${result.text.length.toLocaleString()} characters).`,
              "success",
            );
          } catch (error) {
            // Error is already handled by onError callback
            onError(
              `Error processing PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
              "error",
            );
          } finally {
            setIsProcessingPdf(false);
          }
        };
        reader.onerror = () => {
          onError("Error reading PDF file", "error");
          setIsProcessingPdf(false);
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        // Error is already handled by onError callback
        onError("Error reading PDF file", "error");
        setIsProcessingPdf(false);
      }
      return;
    }

    // Handle text files
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setPdfFileName(null);
        onTextExtracted(content, file.name);
        onError("Text file loaded successfully", "success");
      };
      reader.onerror = () => {
        onError("Error reading text file", "error");
      };
      reader.readAsText(file);
      return;
    }

    onError("Please select a .txt or .pdf file", "error");
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-900 mb-5">
        Upload File (.txt or .pdf)
      </label>
      <input
        type="file"
        accept=".txt,.pdf"
        onChange={handleFileUpload}
        disabled={isProcessingPdf || disabled}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {isProcessingPdf && (
        <div className="mt-3 flex items-center gap-3 text-sm text-blue-600">
          <LoadingSpinner size="sm" />
          <span>Processing PDF: {pdfFileName}...</span>
        </div>
      )}
      {pdfFileName && !isProcessingPdf && (
        <div className="mt-3 text-sm text-green-600 font-medium">
          ✓ PDF loaded: {pdfFileName}
        </div>
      )}
    </div>
  );
}

