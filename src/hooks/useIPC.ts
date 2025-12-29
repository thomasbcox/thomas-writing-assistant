/**
 * React hooks for IPC calls
 * Mimics React Query API for easier migration from tRPC
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ipc } from "~/lib/ipc-client";
import type { Concept, ConceptListItem } from "~/types/database";

// Type definitions for IPC return values
export type ConceptListResult = ConceptListItem[];
export type ConceptResult = Concept;
export type LinkListResult = unknown[];
export type LinkNameListResult = unknown[];
export type CapsuleListResult = unknown[];
export type CapsuleResult = unknown;
export type ConfigResult = { content: string };
export type HealthStatusResult = { status: string; environment?: string };
export type AISettingsResult = unknown;
export type ConceptCandidatesResult = Array<{
  title: string;
  content: string;
  summary: string;
  description?: string;
}>;

// Global query cache for useUtils
const queryCache = new Map<string, () => Promise<void>>();

// Query hook (for read operations)
export function useIPCQuery<T>(
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    refetchOnMount?: boolean;
    queryKey?: string; // For useUtils invalidation
    inputs?: any[]; // Input values to track for change detection (prevents infinite loops)
  },
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const queryKeyRef = useRef(options?.queryKey);

  const enabled = options?.enabled !== false;
  const refetchOnMount = options?.refetchOnMount !== false;

  // Store queryFn in a ref to avoid recreating fetchData on every render
  // This prevents infinite loops when queryFn is recreated
  const queryFnRef = useRef(queryFn);
  
  // Update ref when queryFn changes, but don't trigger re-renders
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  // Create a stable key from inputs to detect when they actually change
  // This prevents infinite loops when input objects are recreated with same values
  const inputsKey = options?.inputs ? JSON.stringify(options.inputs) : null;
  const prevInputsKeyRef = useRef<string | null>(inputsKey);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFnRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [enabled]); // Removed queryFn from deps to prevent loops

  const refetch = useCallback(() => {
    if (enabled) {
      return fetchData();
    }
    return Promise.resolve();
  }, [fetchData, enabled]);

  // Register refetch function for useUtils
  useEffect(() => {
    if (queryKeyRef.current) {
      queryCache.set(queryKeyRef.current, refetch);
      return () => {
        queryCache.delete(queryKeyRef.current!);
      };
    }
  }, [refetch]);

  // Track if inputs actually changed (by value, not reference)
  const inputsChanged = inputsKey !== null && inputsKey !== prevInputsKeyRef.current;
  
  // Update the ref when inputs change
  useEffect(() => {
    prevInputsKeyRef.current = inputsKey;
  }, [inputsKey]);

  useEffect(() => {
    // Only refetch if:
    // 1. Enabled and (refetchOnMount OR data is null OR inputs changed)
    // 2. This prevents infinite loops from function reference changes
    if (enabled && (refetchOnMount || data === null || inputsChanged)) {
      fetchData();
    } else if (!enabled) {
      setIsLoading(false);
    }
    // Depend on inputsKey to trigger when input values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, refetchOnMount, enabled, inputsKey, data === null]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

// Mutation hook (for write operations)
export function useIPCMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
  },
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (variables: TVariables, callOptions?: { onSuccess?: (data: TData) => void; onError?: (error: Error) => void }) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setData(result);
        callOptions?.onSuccess?.(result) ?? options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        callOptions?.onError?.(error) ?? options?.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, options],
  );

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      return mutate(variables);
    },
    [mutate],
  );

  return {
    mutate,
    mutateAsync,
    isLoading,
    error,
    data,
  };
}

// useUtils hook for query invalidation
export function useUtils() {
  return {
    concept: {
      list: {
        invalidate: () => {
          const refetch = queryCache.get("concept:list");
          if (refetch) {
            return refetch();
          }
          return Promise.resolve();
        },
      },
    },
    link: {
      getByConcept: {
        invalidate: (input: { conceptId: string }) => {
          const refetch = queryCache.get(`link:getByConcept:${input.conceptId}`);
          if (refetch) {
            return refetch();
          }
          return Promise.resolve();
        },
      },
      getAll: {
        invalidate: () => {
          const refetch = queryCache.get("link:getAll");
          if (refetch) {
            return refetch();
          }
          return Promise.resolve();
        },
      },
    },
  };
}

// Convenience hooks that match tRPC API structure
export const api = {
  useUtils,
  concept: {
    list: {
      useQuery: (input: { includeTrash?: boolean; search?: string }) =>
        useIPCQuery<ConceptListResult>(
          () => ipc.concept.list(input) as Promise<ConceptListResult>,
          { queryKey: "concept:list", inputs: [input.includeTrash, input.search] },
        ),
    },
    getById: {
      useQuery: (input: { id: string }, options?: { enabled?: boolean }) =>
        useIPCQuery<ConceptResult>(
          () => ipc.concept.getById(input) as Promise<ConceptResult>,
          { ...options, queryKey: `concept:getById:${input.id}`, inputs: [input.id] },
        ),
    },
    create: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.concept.create, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    update: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.concept.update, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    delete: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.concept.delete, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    restore: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.concept.restore, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    purgeTrash: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.concept.purgeTrash, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    proposeLinks: {
      useQuery: (input: { conceptId: string; maxProposals?: number }) =>
        useIPCQuery(
          () => ipc.concept.proposeLinks(input) as Promise<unknown>,
          { inputs: [input.conceptId, input.maxProposals] },
        ),
    },
    generateCandidates: {
      useMutation: (
        options?: {
          onSuccess?: (data: ConceptCandidatesResult) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation<ConceptCandidatesResult, Parameters<typeof ipc.concept.generateCandidates>[0]>(
          ipc.concept.generateCandidates as (input: Parameters<typeof ipc.concept.generateCandidates>[0]) => Promise<ConceptCandidatesResult>,
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
  },
  capsule: {
    list: {
      useQuery: (input?: { summary?: boolean }) =>
        useIPCQuery<CapsuleListResult>(
          () => ipc.capsule.list(input) as Promise<CapsuleListResult>,
          { queryKey: "capsule:list", inputs: [input?.summary] },
        ),
    },
    getById: {
      useQuery: (input: { id: string }) =>
        useIPCQuery<CapsuleResult>(
          () => ipc.capsule.getById(input) as Promise<CapsuleResult>,
          { queryKey: `capsule:getById:${input.id}`, inputs: [input.id] },
        ),
    },
    create: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.capsule.create, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    createAnchorFromPDF: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.capsule.createAnchorFromPDF, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    updateAnchor: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(
          async (input: { id: string; title?: string; content?: string; painPoints?: string[]; solutionSteps?: string[]; proof?: string }) => {
            throw new Error("updateAnchor not yet implemented");
          },
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
    deleteAnchor: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(
          async (input: { id: string }) => {
            throw new Error("deleteAnchor not yet implemented");
          },
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
    regenerateRepurposedContent: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(
          async (input: { anchorId: string }) => {
            throw new Error("regenerateRepurposedContent not yet implemented");
          },
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
    updateRepurposedContent: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(
          async (input: { id: string; content?: string }) => {
            throw new Error("updateRepurposedContent not yet implemented");
          },
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
    deleteRepurposedContent: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(
          async (input: { id: string }) => {
            throw new Error("deleteRepurposedContent not yet implemented");
          },
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
  },
  link: {
    getAll: {
      useQuery: (input?: { summary?: boolean }) =>
        useIPCQuery<LinkListResult>(
          () => ipc.link.getAll(input) as Promise<LinkListResult>,
          { queryKey: "link:getAll", inputs: [input?.summary] },
        ),
    },
    getByConcept: {
      useQuery: (input: { conceptId: string }) =>
        useIPCQuery<LinkListResult>(
          () => ipc.link.getByConcept(input) as Promise<LinkListResult>,
          { queryKey: `link:getByConcept:${input.conceptId}`, inputs: [input.conceptId] },
        ),
    },
    create: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.link.create, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    delete: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.link.delete, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
  },
  linkName: {
    getAll: {
      useQuery: () =>
        useIPCQuery<LinkNameListResult>(
          () => ipc.linkName.getAll() as Promise<LinkNameListResult>,
          { queryKey: "linkName:getAll", inputs: [] },
        ),
    },
    create: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.linkName.create, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    update: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.linkName.update, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    delete: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.linkName.delete, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    getUsage: {
      useQuery: (input: { id: string }) =>
        useIPCQuery(
          () => ipc.linkName.getUsage(input) as Promise<unknown>,
          { inputs: [input.id] },
        ),
    },
  },
  config: {
    getStyleGuide: {
      useQuery: () =>
        useIPCQuery<ConfigResult>(
          () => ipc.config.getStyleGuide() as Promise<ConfigResult>,
          { queryKey: "config:getStyleGuide", inputs: [] },
        ),
    },
    getCredo: {
      useQuery: () =>
        useIPCQuery<ConfigResult>(
          () => ipc.config.getCredo() as Promise<ConfigResult>,
          { queryKey: "config:getCredo", inputs: [] },
        ),
    },
    getConstraints: {
      useQuery: () =>
        useIPCQuery<ConfigResult>(
          () => ipc.config.getConstraints() as Promise<ConfigResult>,
          { queryKey: "config:getConstraints", inputs: [] },
        ),
    },
    getStyleGuideRaw: {
      useQuery: () =>
        useIPCQuery<ConfigResult>(
          () => ipc.config.getStyleGuideRaw() as Promise<ConfigResult>,
          { queryKey: "config:getStyleGuideRaw", inputs: [] },
        ),
    },
    getCredoRaw: {
      useQuery: () =>
        useIPCQuery<ConfigResult>(
          () => ipc.config.getCredoRaw() as Promise<ConfigResult>,
          { queryKey: "config:getCredoRaw", inputs: [] },
        ),
    },
    getConstraintsRaw: {
      useQuery: () =>
        useIPCQuery<ConfigResult>(
          () => ipc.config.getConstraintsRaw() as Promise<ConfigResult>,
          { queryKey: "config:getConstraintsRaw", inputs: [] },
        ),
    },
    updateStyleGuide: {
      useMutation: (
        options?: {
          onSuccess?: (data: ConfigResult) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation<ConfigResult, Parameters<typeof ipc.config.updateStyleGuide>[0]>(
          ipc.config.updateStyleGuide as (input: Parameters<typeof ipc.config.updateStyleGuide>[0]) => Promise<ConfigResult>,
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
    updateCredo: {
      useMutation: (
        options?: {
          onSuccess?: (data: ConfigResult) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation<ConfigResult, Parameters<typeof ipc.config.updateCredo>[0]>(
          ipc.config.updateCredo as (input: Parameters<typeof ipc.config.updateCredo>[0]) => Promise<ConfigResult>,
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
    updateConstraints: {
      useMutation: (
        options?: {
          onSuccess?: (data: ConfigResult) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation<ConfigResult, Parameters<typeof ipc.config.updateConstraints>[0]>(
          ipc.config.updateConstraints as (input: Parameters<typeof ipc.config.updateConstraints>[0]) => Promise<ConfigResult>,
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
    getStatus: {
      useQuery: () =>
        useIPCQuery<HealthStatusResult>(
          () => ipc.config.getStatus() as Promise<HealthStatusResult>,
          { queryKey: "config:getStatus", inputs: [] },
        ),
    },
  },
  pdf: {
    extractText: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.pdf.extractText, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
  },
  ai: {
    getSettings: {
      useQuery: () =>
        useIPCQuery<AISettingsResult>(
          () => ipc.ai.getSettings() as Promise<AISettingsResult>,
          { queryKey: "ai:getSettings", inputs: [] },
        ),
    },
    updateSettings: {
      useMutation: (
        options?: {
          onSuccess?: (data: AISettingsResult) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation<AISettingsResult, Parameters<typeof ipc.ai.updateSettings>[0]>(
          ipc.ai.updateSettings as (input: Parameters<typeof ipc.ai.updateSettings>[0]) => Promise<AISettingsResult>,
          {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
          },
        ),
    },
    getAvailableModels: {
      useQuery: () =>
        useIPCQuery<unknown[]>(
          () => ipc.ai.getAvailableModels() as Promise<unknown[]>,
          { queryKey: "ai:getAvailableModels", inputs: [] },
        ),
    },
  },
};

