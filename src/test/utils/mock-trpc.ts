import { jest } from "@jest/globals";

/**
 * Utilities for mocking tRPC hooks in component tests
 */

export interface MockTRPCQueryResult<T> {
  data?: T;
  isLoading?: boolean;
  error?: Error | null;
  refetch?: ReturnType<typeof jest.fn>;
}

export interface MockTRPCMutationResult<T> {
  mutate?: ReturnType<typeof jest.fn>;
  mutateAsync?: ReturnType<typeof jest.fn>;
  isPending?: boolean;
  error?: Error | null;
}

/**
 * Create a mock useQuery hook
 */
export function createMockQuery<T>(
  data?: T,
  options?: Partial<MockTRPCQueryResult<T>>,
): ReturnType<typeof jest.fn> {
  return jest.fn(() => ({
    data,
    isLoading: options?.isLoading ?? false,
    error: options?.error ?? null,
    refetch: options?.refetch ?? jest.fn(),
    ...options,
  }));
}

/**
 * Create a mock useMutation hook
 */
export function createMockMutation<T, V>(
  options?: Partial<MockTRPCMutationResult<T>>,
): ReturnType<typeof jest.fn> {
  const mutate = jest.fn();
  const mutateAsync = jest.fn(() => Promise.resolve(undefined as T));

  return jest.fn(() => ({
    mutate,
    mutateAsync,
    isPending: options?.isPending ?? false,
    error: options?.error ?? null,
    ...options,
  }));
}

/**
 * Reset all mocks (useful in beforeEach)
 */
export function resetAllMocks(): void {
  jest.clearAllMocks();
}

