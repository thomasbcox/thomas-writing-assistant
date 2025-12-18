/**
 * React Query hooks for links API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Link {
  id: string;
  sourceId: string;
  targetId: string;
  forwardName: string;
  reverseName: string;
  notes: string | null;
  createdAt: Date;
  source?: {
    id: string;
    title: string;
  };
  target?: {
    id: string;
    title: string;
  };
}

export interface LinksResponse {
  outgoing: Link[];
  incoming: Link[];
}

export interface CreateLinkInput {
  sourceId: string;
  targetId: string;
  forwardName: string;
  reverseName?: string;
  notes?: string;
}

// Get all links
export function useLinks() {
  return useQuery<Link[]>({
    queryKey: ["links"],
    queryFn: async () => {
      const response = await fetch("/api/links");
      if (!response.ok) throw new Error("Failed to fetch links");
      return response.json();
    },
  });
}

// Get links for a concept
export function useLinksByConcept(conceptId: string | null) {
  return useQuery<LinksResponse>({
    queryKey: ["links", conceptId],
    queryFn: async () => {
      if (!conceptId) throw new Error("Concept ID is required");
      const response = await fetch(`/api/links?conceptId=${conceptId}`);
      if (!response.ok) throw new Error("Failed to fetch links");
      return response.json();
    },
    enabled: !!conceptId,
  });
}

// Create link
export function useCreateLink() {
  const queryClient = useQueryClient();
  
  return useMutation<Link, Error, CreateLinkInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create link");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
      queryClient.invalidateQueries({ queryKey: ["links", variables.sourceId] });
      queryClient.invalidateQueries({ queryKey: ["links", variables.targetId] });
      queryClient.invalidateQueries({ queryKey: ["concepts", variables.sourceId] });
      queryClient.invalidateQueries({ queryKey: ["concepts", variables.targetId] });
    },
  });
}

// Delete link
export function useDeleteLink() {
  const queryClient = useQueryClient();
  
  return useMutation<Link, Error, { sourceId: string; targetId: string }>({
    mutationFn: async ({ sourceId, targetId }) => {
      const response = await fetch(`/api/links/${sourceId}/${targetId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete link");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
      queryClient.invalidateQueries({ queryKey: ["links", variables.sourceId] });
      queryClient.invalidateQueries({ queryKey: ["links", variables.targetId] });
      queryClient.invalidateQueries({ queryKey: ["concepts", variables.sourceId] });
      queryClient.invalidateQueries({ queryKey: ["concepts", variables.targetId] });
    },
  });
}

