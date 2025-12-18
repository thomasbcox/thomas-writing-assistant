/**
 * React Query hooks for config API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ConfigStatus {
  styleGuide: { loaded: boolean; isEmpty: boolean };
  credo: { loaded: boolean; isEmpty: boolean };
  constraints: { loaded: boolean; isEmpty: boolean };
}

// Get config status
export function useConfigStatus() {
  return useQuery<ConfigStatus>({
    queryKey: ["config", "status"],
    queryFn: async () => {
      const response = await fetch("/api/config/status");
      if (!response.ok) throw new Error("Failed to fetch config status");
      return response.json();
    },
  });
}

// Get style guide (parsed)
export function useStyleGuide() {
  return useQuery<unknown>({
    queryKey: ["config", "style-guide"],
    queryFn: async () => {
      const response = await fetch("/api/config/style-guide");
      if (!response.ok) throw new Error("Failed to fetch style guide");
      return response.json();
    },
  });
}

// Get style guide (raw YAML)
export function useStyleGuideRaw() {
  return useQuery<{ content: string }>({
    queryKey: ["config", "style-guide", "raw"],
    queryFn: async () => {
      const response = await fetch("/api/config/style-guide?raw=true");
      if (!response.ok) throw new Error("Failed to fetch style guide");
      return response.json();
    },
  });
}

// Update style guide
export function useUpdateStyleGuide() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean }, Error, { content: string }>({
    mutationFn: async (input) => {
      const response = await fetch("/api/config/style-guide", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update style guide");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
}

// Get credo (parsed)
export function useCredo() {
  return useQuery<unknown>({
    queryKey: ["config", "credo"],
    queryFn: async () => {
      const response = await fetch("/api/config/credo");
      if (!response.ok) throw new Error("Failed to fetch credo");
      return response.json();
    },
  });
}

// Get credo (raw YAML)
export function useCredoRaw() {
  return useQuery<{ content: string }>({
    queryKey: ["config", "credo", "raw"],
    queryFn: async () => {
      const response = await fetch("/api/config/credo?raw=true");
      if (!response.ok) throw new Error("Failed to fetch credo");
      return response.json();
    },
  });
}

// Update credo
export function useUpdateCredo() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean }, Error, { content: string }>({
    mutationFn: async (input) => {
      const response = await fetch("/api/config/credo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update credo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
}

// Get constraints (parsed)
export function useConstraints() {
  return useQuery<unknown>({
    queryKey: ["config", "constraints"],
    queryFn: async () => {
      const response = await fetch("/api/config/constraints");
      if (!response.ok) throw new Error("Failed to fetch constraints");
      return response.json();
    },
  });
}

// Get constraints (raw YAML)
export function useConstraintsRaw() {
  return useQuery<{ content: string }>({
    queryKey: ["config", "constraints", "raw"],
    queryFn: async () => {
      const response = await fetch("/api/config/constraints?raw=true");
      if (!response.ok) throw new Error("Failed to fetch constraints");
      return response.json();
    },
  });
}

// Update constraints
export function useUpdateConstraints() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean }, Error, { content: string }>({
    mutationFn: async (input) => {
      const response = await fetch("/api/config/constraints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update constraints");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
}

