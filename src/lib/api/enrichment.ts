/**
 * Concept Enrichment API hooks
 * TODO: Implement IPC handlers for concept enrichment
 */

import { useIPCMutation } from "~/hooks/useIPC";
import type { ConceptFormData } from "~/server/services/conceptEnricher";

export interface AISuggestion {
  id: string;
  field: keyof ConceptFormData;
  currentValue: string;
  suggestedValue: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

export interface QuickAction {
  id: string;
  label: string;
  action: string;
  description?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: AISuggestion[];
  actions?: QuickAction[];
}

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

