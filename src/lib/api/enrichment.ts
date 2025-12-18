/**
 * React Query hooks for enrichment API
 */

import { useMutation } from "@tanstack/react-query";
import type { ConceptFormData, AISuggestion, QuickAction, ChatMessage } from "~/server/services/conceptEnricher";

// Re-export types from service for consistency
export type { ConceptFormData, AISuggestion, QuickAction, ChatMessage };

export interface AnalyzeResponse {
  suggestions: AISuggestion[];
  quickActions: QuickAction[];
  initialMessage: string;
}

export interface EnrichMetadataResponse {
  creator?: string;
  source?: string;
  year?: string;
}

export interface ChatResponse {
  response: string;
  suggestions: AISuggestion[];
  actions: QuickAction[];
}

// Analyze concept
export function useAnalyzeConcept() {
  return useMutation<AnalyzeResponse, Error, ConceptFormData>({
    mutationFn: async (input) => {
      const response = await fetch("/api/enrichment/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze concept");
      }
      return response.json();
    },
  });
}

// Enrich metadata
export function useEnrichMetadata() {
  return useMutation<EnrichMetadataResponse, Error, { title: string; description: string }>({
    mutationFn: async (input) => {
      const response = await fetch("/api/enrichment/enrich-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to enrich metadata");
      }
      return response.json();
    },
  });
}

// Chat enrichment
export function useChatEnrich() {
  return useMutation<
    ChatResponse,
    Error,
    {
      message: string;
      conceptData: ConceptFormData;
      chatHistory: ChatMessage[];
    }
  >({
    mutationFn: async (input) => {
      const response = await fetch("/api/enrichment/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          chatHistory: input.chatHistory.map((msg) => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
          })),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process chat message");
      }
      return response.json();
    },
  });
}

// Expand definition
export function useExpandDefinition() {
  return useMutation<{ expanded: string }, Error, { currentDefinition: string; conceptTitle: string }>({
    mutationFn: async (input) => {
      const response = await fetch("/api/enrichment/expand-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to expand definition");
      }
      return response.json();
    },
  });
}

