/**
 * React Query hooks for AI API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AISettings {
  provider: "openai" | "gemini";
  model: string;
  temperature: number;
  availableProviders: {
    openai: boolean;
    gemini: boolean;
  };
}

export interface UpdateAISettingsInput {
  provider?: "openai" | "gemini";
  model?: string;
  temperature?: number;
}

export interface AIModel {
  value: string;
  label: string;
}

export interface AvailableModels {
  provider: "openai" | "gemini";
  models: AIModel[];
}

// Get AI settings
export function useAISettings() {
  return useQuery<AISettings>({
    queryKey: ["ai", "settings"],
    queryFn: async () => {
      const response = await fetch("/api/ai/settings");
      if (!response.ok) throw new Error("Failed to fetch AI settings");
      return response.json();
    },
  });
}

// Update AI settings
export function useUpdateAISettings() {
  const queryClient = useQueryClient();
  
  return useMutation<AISettings, Error, UpdateAISettingsInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update AI settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "settings"] });
    },
  });
}

// Get available models
export function useAvailableModels() {
  return useQuery<AvailableModels>({
    queryKey: ["ai", "models"],
    queryFn: async () => {
      const response = await fetch("/api/ai/models");
      if (!response.ok) throw new Error("Failed to fetch available models");
      return response.json();
    },
  });
}

