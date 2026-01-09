/**
 * Concept Enrichment API hooks
 * 
 * These hooks use IPC to communicate with the enrichment handlers
 * in electron/ipc-handlers/enrichment-handlers.ts
 */

import { api } from "~/hooks/useIPC";
import type { ConceptFormData, AISuggestion, QuickAction, ChatMessage } from "~/server/services/conceptEnricher";

// Re-export types from the server service for consistency
export type { AISuggestion, QuickAction, ChatMessage } from "~/server/services/conceptEnricher";

export interface AnalyzeConceptResponse {
  suggestions: AISuggestion[];
  quickActions: QuickAction[];
  initialMessage: string;
}

export function useAnalyzeConcept() {
  return api.enrichment.analyze.useMutation();
}

export function useEnrichMetadata() {
  return api.enrichment.enrichMetadata.useMutation();
}

export function useChatEnrich() {
  return api.enrichment.chat.useMutation();
}

export function useExpandDefinition() {
  return api.enrichment.expandDefinition.useMutation();
}

