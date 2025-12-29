/**
 * React hooks for IPC calls
 * Mimics React Query API for easier migration from tRPC
 */

import { useState, useEffect, useCallback } from "react";
import { ipc } from "~/lib/ipc-client";

// Query hook (for read operations)
export function useIPCQuery<T>(
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    refetchOnMount?: boolean;
  },
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options?.enabled !== false;
  const refetchOnMount = options?.refetchOnMount !== false;

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, enabled]);

  useEffect(() => {
    if (enabled && (refetchOnMount || data === null)) {
      fetchData();
    } else if (!enabled) {
      setIsLoading(false);
    }
  }, [fetchData, refetchOnMount, data, enabled]);

  const refetch = useCallback(() => {
    if (enabled) {
      return fetchData();
    }
  }, [fetchData, enabled]);

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
    async (variables: TVariables) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setData(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
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

// Convenience hooks that match tRPC API structure
export const api = {
  concept: {
    list: {
      useQuery: (input: { includeTrash?: boolean; search?: string }) =>
        useIPCQuery(() => ipc.concept.list(input)),
    },
    getById: {
      useQuery: (input: { id: string }, options?: { enabled?: boolean }) =>
        useIPCQuery(() => ipc.concept.getById(input), options),
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
        useIPCQuery(() => ipc.concept.proposeLinks(input)),
    },
    generateCandidates: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.concept.generateCandidates, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
  },
  capsule: {
    list: {
      useQuery: (input?: { summary?: boolean }) =>
        useIPCQuery(() => ipc.capsule.list(input)),
    },
    getById: {
      useQuery: (input: { id: string }) =>
        useIPCQuery(() => ipc.capsule.getById(input)),
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
        useIPCQuery(() => ipc.link.getAll(input)),
    },
    getByConcept: {
      useQuery: (input: { conceptId: string }) =>
        useIPCQuery(() => ipc.link.getByConcept(input)),
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
      useQuery: () => useIPCQuery(() => ipc.linkName.getAll()),
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
        useIPCQuery(() => ipc.linkName.getUsage(input)),
    },
  },
  config: {
    getStyleGuide: {
      useQuery: () => useIPCQuery(() => ipc.config.getStyleGuide()),
    },
    getCredo: {
      useQuery: () => useIPCQuery(() => ipc.config.getCredo()),
    },
    getConstraints: {
      useQuery: () => useIPCQuery(() => ipc.config.getConstraints()),
    },
    getStyleGuideRaw: {
      useQuery: () => useIPCQuery(() => ipc.config.getStyleGuideRaw()),
    },
    getCredoRaw: {
      useQuery: () => useIPCQuery(() => ipc.config.getCredoRaw()),
    },
    getConstraintsRaw: {
      useQuery: () => useIPCQuery(() => ipc.config.getConstraintsRaw()),
    },
    updateStyleGuide: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.config.updateStyleGuide, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    updateCredo: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.config.updateCredo, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    updateConstraints: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.config.updateConstraints, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    getStatus: {
      useQuery: () => useIPCQuery(() => ipc.config.getStatus()),
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
      useQuery: () => useIPCQuery(() => ipc.ai.getSettings()),
    },
    updateSettings: {
      useMutation: (
        options?: {
          onSuccess?: (data: any) => void;
          onError?: (error: Error) => void;
        },
      ) =>
        useIPCMutation(ipc.ai.updateSettings, {
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
    },
    getAvailableModels: {
      useQuery: () => useIPCQuery(() => ipc.ai.getAvailableModels()),
    },
  },
};

