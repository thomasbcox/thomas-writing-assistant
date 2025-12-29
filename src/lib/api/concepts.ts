/**
 * Concepts API hooks
 * Wrappers around IPC hooks for concept operations
 */

import { api } from "~/hooks/useIPC";
import type { ConceptListItem } from "~/types/database";

export function useConceptList(options?: { includeTrash?: boolean; search?: string }) {
  return api.concept.list.useQuery({
    includeTrash: options?.includeTrash ?? false,
    search: options?.search,
  });
}

export function useConcept(conceptId: string | null) {
  return api.concept.getById.useQuery(
    { id: conceptId! },
    { enabled: conceptId !== null },
  );
}

export function useCreateConcept() {
  return api.concept.create.useMutation();
}

export function useUpdateConcept() {
  return api.concept.update.useMutation();
}

export function useDeleteConcept() {
  return api.concept.delete.useMutation();
}

