/**
 * React Query hooks for concepts API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Concept {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  content: string;
  creator: string | null;
  source: string | null;
  year: string | null;
  status: string;
  trashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConceptListParams {
  includeTrash?: boolean;
  search?: string;
}

export interface CreateConceptInput {
  title: string;
  description?: string;
  content: string;
  creator?: string;
  source?: string;
  year?: string;
}

export interface UpdateConceptInput {
  title?: string;
  description?: string;
  content?: string;
  creator?: string;
  source?: string;
  year?: string;
}

// List concepts
export function useConceptList(params?: ConceptListParams) {
  return useQuery<Concept[]>({
    queryKey: ["concepts", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.includeTrash) searchParams.set("includeTrash", "true");
      if (params?.search) searchParams.set("search", params.search);
      
      const url = `/api/concepts${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch concepts");
      return response.json();
    },
  });
}

// Get concept by ID
export function useConcept(id: string | null) {
  return useQuery<Concept>({
    queryKey: ["concepts", id],
    queryFn: async () => {
      if (!id) throw new Error("Concept ID is required");
      const response = await fetch(`/api/concepts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch concept");
      return response.json();
    },
    enabled: !!id,
  });
}

// Create concept
export function useCreateConcept() {
  const queryClient = useQueryClient();
  
  return useMutation<Concept, Error, CreateConceptInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create concept");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concepts"] });
    },
  });
}

// Update concept
export function useUpdateConcept() {
  const queryClient = useQueryClient();
  
  return useMutation<Concept, Error, { id: string; data: UpdateConceptInput }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/concepts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update concept");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["concepts"] });
      queryClient.invalidateQueries({ queryKey: ["concepts", variables.id] });
    },
  });
}

// Delete concept (soft delete)
export function useDeleteConcept() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/concepts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete concept");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concepts"] });
    },
  });
}

// Restore concept
export function useRestoreConcept() {
  const queryClient = useQueryClient();
  
  return useMutation<Concept, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/concepts/${id}/restore`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to restore concept");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concepts"] });
    },
  });
}

// Purge trash
export function usePurgeTrash() {
  const queryClient = useQueryClient();
  
  return useMutation<{ deletedCount: number }, Error, { daysOld?: number }>({
    mutationFn: async (input) => {
      const response = await fetch("/api/concepts/purge-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to purge trash");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concepts"] });
    },
  });
}

// Propose links for a concept
export function useProposeLinks(conceptId: string | null, maxProposals = 5) {
  return useQuery<Array<{
    source: string;
    target: string;
    target_title: string;
    forward_name: string;
    confidence: number;
    reasoning: string;
  }>>({
    queryKey: ["concepts", conceptId, "propose-links"],
    queryFn: async () => {
      if (!conceptId) throw new Error("Concept ID is required");
      const response = await fetch(`/api/concepts/${conceptId}/propose-links?maxProposals=${maxProposals}`);
      if (!response.ok) throw new Error("Failed to propose links");
      return response.json();
    },
    enabled: false, // Only fetch when explicitly called via refetch
  });
}

// Generate candidates
export function useGenerateCandidates() {
  return useMutation<
    Array<{
      title: string;
      coreDefinition: string;
      managerialApplication: string;
      content: string;
    }>,
    Error,
    {
      text: string;
      instructions?: string;
      maxCandidates?: number;
      defaultCreator?: string;
      defaultYear?: string;
    }
  >({
    mutationFn: async (input) => {
      const response = await fetch("/api/concepts/generate-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      
      // Handle case where API returns error message with empty candidates
      if (data.error && Array.isArray(data.candidates) && data.candidates.length === 0) {
        throw new Error(data.error);
      }
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate candidates");
      }
      
      // Ensure we return an array
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format: expected array of candidates");
      }
      
      return data;
    },
  });
}

