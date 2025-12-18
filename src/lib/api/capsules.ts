/**
 * React Query hooks for capsules API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Capsule {
  id: string;
  title: string;
  promise: string;
  cta: string;
  offerMapping: string | null;
  createdAt: Date;
  updatedAt: Date;
  anchors?: Anchor[];
}

export interface Anchor {
  id: string;
  capsuleId: string;
  title: string;
  content: string;
  painPoints: string | null;
  solutionSteps: string | null;
  proof: string | null;
  createdAt: Date;
  updatedAt: Date;
  repurposedContent?: RepurposedContent[];
}

export interface RepurposedContent {
  id: string;
  anchorId: string;
  type: string;
  content: string;
  guidance: string | null;
  createdAt: Date;
}

export interface CreateCapsuleInput {
  title: string;
  promise: string;
  cta: string;
  offerMapping?: string;
}

export interface CreateAnchorInput {
  title: string;
  content: string;
  painPoints?: string[];
  solutionSteps?: string[];
  proof?: string;
}

export interface UpdateAnchorInput {
  title?: string;
  content?: string;
  painPoints?: string[];
  solutionSteps?: string[];
  proof?: string;
}

export interface CreateRepurposedInput {
  type: string;
  content: string;
  guidance?: string;
}

export interface UpdateRepurposedInput {
  type?: string;
  content?: string;
  guidance?: string | null;
}

// List capsules
export function useCapsuleList() {
  return useQuery<Capsule[]>({
    queryKey: ["capsules"],
    queryFn: async () => {
      const response = await fetch("/api/capsules");
      if (!response.ok) throw new Error("Failed to fetch capsules");
      return response.json();
    },
  });
}

// Get capsule by ID
export function useCapsule(id: string | null) {
  return useQuery<Capsule>({
    queryKey: ["capsules", id],
    queryFn: async () => {
      if (!id) throw new Error("Capsule ID is required");
      const response = await fetch(`/api/capsules/${id}`);
      if (!response.ok) throw new Error("Failed to fetch capsule");
      return response.json();
    },
    enabled: !!id,
  });
}

// Create capsule
export function useCreateCapsule() {
  const queryClient = useQueryClient();
  
  return useMutation<Capsule, Error, CreateCapsuleInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create capsule");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
    },
  });
}

// Create anchor
export function useCreateAnchor() {
  const queryClient = useQueryClient();
  
  return useMutation<Anchor, Error, { capsuleId: string; data: CreateAnchorInput }>({
    mutationFn: async ({ capsuleId, data }) => {
      const response = await fetch(`/api/capsules/${capsuleId}/anchors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create anchor");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
      queryClient.invalidateQueries({ queryKey: ["capsules", variables.capsuleId] });
    },
  });
}

// Update anchor
export function useUpdateAnchor() {
  const queryClient = useQueryClient();
  
  return useMutation<Anchor, Error, { capsuleId: string; anchorId: string; data: UpdateAnchorInput }>({
    mutationFn: async ({ capsuleId, anchorId, data }) => {
      const response = await fetch(`/api/capsules/${capsuleId}/anchors/${anchorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update anchor");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
      queryClient.invalidateQueries({ queryKey: ["capsules", variables.capsuleId] });
    },
  });
}

// Delete anchor
export function useDeleteAnchor() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean }, Error, { capsuleId: string; anchorId: string }>({
    mutationFn: async ({ capsuleId, anchorId }) => {
      const response = await fetch(`/api/capsules/${capsuleId}/anchors/${anchorId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete anchor");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
      queryClient.invalidateQueries({ queryKey: ["capsules", variables.capsuleId] });
    },
  });
}

// Create anchor from PDF
export function useCreateAnchorFromPDF() {
  const queryClient = useQueryClient();
  
  return useMutation<
    {
      anchor: Anchor;
      repurposedContent: RepurposedContent[];
      metadata: {
        title: string;
        painPoints: string[];
        solutionSteps: string[];
        proof?: string;
      };
    },
    Error,
    { capsuleId: string; fileData: string; fileName?: string; autoRepurpose?: boolean }
  >({
    mutationFn: async ({ capsuleId, fileData, fileName, autoRepurpose }) => {
      const response = await fetch(`/api/capsules/${capsuleId}/anchors/from-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData, fileName, autoRepurpose }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create anchor from PDF");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
      queryClient.invalidateQueries({ queryKey: ["capsules", variables.capsuleId] });
    },
  });
}

// Create repurposed content
export function useCreateRepurposedContent() {
  const queryClient = useQueryClient();
  
  return useMutation<RepurposedContent, Error, { capsuleId: string; anchorId: string; data: CreateRepurposedInput }>({
    mutationFn: async ({ capsuleId, anchorId, data }) => {
      const response = await fetch(`/api/capsules/${capsuleId}/anchors/${anchorId}/repurposed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create repurposed content");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
      queryClient.invalidateQueries({ queryKey: ["capsules", variables.capsuleId] });
    },
  });
}

// Update repurposed content
export function useUpdateRepurposedContent() {
  const queryClient = useQueryClient();
  
  return useMutation<RepurposedContent, Error, { capsuleId: string; anchorId: string; repurposedId: string; data: UpdateRepurposedInput }>({
    mutationFn: async ({ capsuleId, anchorId, repurposedId, data }) => {
      const response = await fetch(`/api/capsules/${capsuleId}/anchors/${anchorId}/repurposed/${repurposedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update repurposed content");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
      queryClient.invalidateQueries({ queryKey: ["capsules", variables.capsuleId] });
    },
  });
}

// Delete repurposed content
export function useDeleteRepurposedContent() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean }, Error, { capsuleId: string; anchorId: string; repurposedId: string }>({
    mutationFn: async ({ capsuleId, anchorId, repurposedId }) => {
      const response = await fetch(`/api/capsules/${capsuleId}/anchors/${anchorId}/repurposed/${repurposedId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete repurposed content");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
      queryClient.invalidateQueries({ queryKey: ["capsules", variables.capsuleId] });
    },
  });
}

// Regenerate all repurposed content for an anchor
export function useRegenerateRepurposedContent() {
  const queryClient = useQueryClient();
  
  return useMutation<{ repurposedContent: RepurposedContent[] }, Error, { capsuleId: string; anchorId: string }>({
    mutationFn: async ({ capsuleId, anchorId }) => {
      const response = await fetch(`/api/capsules/${capsuleId}/anchors/${anchorId}/repurposed/regenerate-all`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate repurposed content");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
      queryClient.invalidateQueries({ queryKey: ["capsules", variables.capsuleId] });
    },
  });
}

