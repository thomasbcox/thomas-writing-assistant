/**
 * React Query hooks for link names API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ProposeLinkNamesInput {
  sourceConceptId: string;
  targetConceptId: string;
}

export interface ProposedLinkName {
  forwardName: string;
  reverseName: string;
  confidence: number;
  reasoning: string;
}

// Get all link names
export function useLinkNames() {
  return useQuery<string[]>({
    queryKey: ["link-names"],
    queryFn: async () => {
      const response = await fetch("/api/link-names");
      if (!response.ok) throw new Error("Failed to fetch link names");
      return response.json();
    },
  });
}

// Create link name
export function useCreateLinkName() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { id: string; name: string; isDefault: boolean },
    Error,
    { name: string }
  >({
    mutationFn: async (input) => {
      const response = await fetch("/api/link-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create link name");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link-names"] });
    },
  });
}

// Update link name
export function useUpdateLinkName() {
  const queryClient = useQueryClient();
  
  return useMutation<{ updatedCount: number; success: boolean }, Error, { oldName: string; newName: string }>({
    mutationFn: async ({ oldName, newName }) => {
      const response = await fetch(`/api/link-names/${encodeURIComponent(oldName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update link name");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link-names"] });
    },
  });
}

// Delete link name
export function useDeleteLinkName() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean; deletedCount: number }, Error, { name: string; replaceWith?: string }>({
    mutationFn: async ({ name, replaceWith }) => {
      const url = new URL(`/api/link-names/${encodeURIComponent(name)}`, window.location.origin);
      if (replaceWith) {
        url.searchParams.set("replaceWith", replaceWith);
      }
      const response = await fetch(url.toString(), {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete link name");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link-names"] });
    },
  });
}

// Get link name usage
export function useLinkNameUsage(name: string | null) {
  return useQuery<{
    name: string;
    count: number;
    links: Array<{
      id: string;
      sourceId: string;
      targetId: string;
      sourceTitle: string;
      targetTitle: string;
    }>;
    isDefault: boolean;
  }>({
    queryKey: ["link-names", name, "usage"],
    queryFn: async () => {
      if (!name) throw new Error("Link name is required");
      const response = await fetch(`/api/link-names/${encodeURIComponent(name)}/usage`);
      if (!response.ok) throw new Error("Failed to fetch link name usage");
      return response.json();
    },
    enabled: !!name,
  });
}

