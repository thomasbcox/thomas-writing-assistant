/**
 * React Query hooks for PDF API
 */

import { useMutation } from "@tanstack/react-query";

export interface ExtractTextInput {
  fileData: string; // Base64 encoded PDF
  fileName?: string;
}

export interface ExtractTextResponse {
  text: string;
  numPages: number;
  info: unknown;
  metadata: unknown;
  fileName?: string;
}

// Extract text from PDF
export function useExtractPDFText() {
  return useMutation<ExtractTextResponse, Error, ExtractTextInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/pdf/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract text from PDF");
      }
      return response.json();
    },
  });
}

