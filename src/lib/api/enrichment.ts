/**
 * Concept Enrichment API hooks
 * 
 * Note: IPC handlers exist in electron/ipc-handlers/enrichment-handlers.ts
 * but are not yet exposed via preload.ts and ipc-client.ts.
 * These hooks currently throw errors - they need to be wired up to IPC.
 */

import { useIPCMutation } from "~/hooks/useIPC";
import type { ConceptFormData, AISuggestion, QuickAction, ChatMessage } from "~/server/services/conceptEnricher";

// Re-export types from the server service for consistency
export type { AISuggestion, QuickAction, ChatMessage } from "~/server/services/conceptEnricher";

export interface AnalyzeConceptResponse {
  suggestions: AISuggestion[];
  quickActions: QuickAction[];
  initialMessage: string;
}

export function useAnalyzeConcept() {
  // TODO: Create IPC handler for concept analysis
  return useIPCMutation<AnalyzeConceptResponse, ConceptFormData>(
    async (input) => {
      throw new Error("Concept analysis not yet implemented via IPC. Please use the service directly.");
    },
  );
}

export function useEnrichMetadata() {
  // TODO: Create IPC handler for metadata enrichment
  return useIPCMutation<Partial<ConceptFormData>, { conceptId: string }>(
    async (input) => {
      throw new Error("Metadata enrichment not yet implemented via IPC. Please use the service directly.");
    },
  );
}

export function useChatEnrich() {
  // TODO: Create IPC handler for enrichment chat
  return useIPCMutation<ChatMessage, { conceptId: string; message: string; history: ChatMessage[] }>(
    async (input) => {
      throw new Error("Enrichment chat not yet implemented via IPC. Please use the service directly.");
    },
  );
}

export function useExpandDefinition() {
  // TODO: Create IPC handler for definition expansion
  return useIPCMutation<{ expandedDefinition: string }, { conceptId: string; currentDefinition: string }>(
    async (input) => {
      throw new Error("Definition expansion not yet implemented via IPC. Please use the service directly.");
    },
  );
}

