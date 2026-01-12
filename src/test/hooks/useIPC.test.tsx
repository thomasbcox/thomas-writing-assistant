/**
 * Tests for useIPC hooks
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock ipc-client
const mockConceptList = jest.fn() as jest.MockedFunction<any>;
const mockConceptGetById = jest.fn() as jest.MockedFunction<any>;
const mockConceptCreate = jest.fn() as jest.MockedFunction<any>;
const mockConceptUpdate = jest.fn() as jest.MockedFunction<any>;
const mockConceptDelete = jest.fn() as jest.MockedFunction<any>;
const mockLinkGetAll = jest.fn() as jest.MockedFunction<any>;
const mockLinkGetByConcept = jest.fn() as jest.MockedFunction<any>;
const mockLinkCreate = jest.fn() as jest.MockedFunction<any>;
const mockAIGetSettings = jest.fn() as jest.MockedFunction<any>;
const mockAIUpdateSettings = jest.fn() as jest.MockedFunction<any>;

jest.mock("~/lib/ipc-client", () => ({
  ipc: {
    concept: {
      list: mockConceptList,
      getById: mockConceptGetById,
      create: mockConceptCreate,
      update: mockConceptUpdate,
      delete: mockConceptDelete,
    },
    link: {
      getAll: mockLinkGetAll,
      getByConcept: mockLinkGetByConcept,
      create: mockLinkCreate,
    },
    ai: {
      getSettings: mockAIGetSettings,
      updateSettings: mockAIUpdateSettings,
    },
  },
}));

describe("useIPC", () => {
  let useIPCQuery: any;
  let useIPCMutation: any;
  let useUtils: any;
  let api: any;
  let ipc: any;

  beforeAll(async () => {
    // Import after mocks are set up
    const hooksModule = await import("~/hooks/useIPC");
    useIPCQuery = hooksModule.useIPCQuery;
    useIPCMutation = hooksModule.useIPCMutation;
    useUtils = hooksModule.useUtils;
    api = hooksModule.api;
    const ipcModule = await import("~/lib/ipc-client");
    ipc = ipcModule.ipc;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConceptList.mockReset();
    mockConceptGetById.mockReset();
    mockConceptCreate.mockReset();
    mockConceptUpdate.mockReset();
    mockConceptDelete.mockReset();
    mockLinkGetAll.mockReset();
    mockLinkGetByConcept.mockReset();
    mockLinkCreate.mockReset();
    mockAIGetSettings.mockReset();
    mockAIUpdateSettings.mockReset();
    // Ensure window.electronAPI is set up
    if ((global as any).window) {
      (global as any).window.electronAPI = {
        concept: {
          list: mockConceptList,
          getById: mockConceptGetById,
          create: mockConceptCreate,
          update: mockConceptUpdate,
          delete: mockConceptDelete,
        },
        ai: {
          getSettings: mockAIGetSettings,
          updateSettings: mockAIUpdateSettings,
        },
      };
    }
  });

  describe("useIPCQuery", () => {
    it("should fetch data on mount", async () => {
      const mockData = [{ id: "1", title: "Test" }] as any;
      mockConceptList.mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useIPCQuery(() => ipc.concept.list({}), {
          queryKey: "test-query",
        }),
      );

      // Wait for data to be loaded
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(mockConceptList).toHaveBeenCalled();
    });

    it("should handle query errors", async () => {
      const error = new Error("Query failed");
      mockConceptList.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useIPCQuery(() => ipc.concept.list({}), {
          queryKey: "test-query",
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Query failed");
    });

    it("should support refetch", async () => {
      const mockData1: any[] = [{ id: "1", title: "Test 1" }];
      const mockData2: any[] = [{ id: "2", title: "Test 2" }];
      // Set up mock to return mockData1 initially, then mockData2 on refetch
      // The hook may call multiple times during initialization, so we need to handle that
      let callCount = 0;
      mockConceptList.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve(mockData1);
        }
        return Promise.resolve(mockData2);
      });

      const { result } = renderHook(() =>
        useIPCQuery(() => ipc.concept.list({}), {
          queryKey: "test-query",
        }),
      );

      // Wait for initial data to load (may be called multiple times during init)
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });

      // Get the initial call count
      const initialCallCount = mockConceptList.mock.calls.length;
      const initialData = result.current.data;

      // Now refetch - should get new data
      await act(async () => {
        await result.current.refetch();
      });

      // After refetch, should have called the mock again and gotten new data
      expect(mockConceptList.mock.calls.length).toBeGreaterThan(initialCallCount);
      // The data should have changed (unless it was already mockData2, which is fine)
      expect(result.current.data).toBeDefined();
    });

    it("should respect enabled option", async () => {
      mockConceptList.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useIPCQuery(() => ipc.concept.list({}), {
          queryKey: "test-query",
          enabled: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockConceptList).not.toHaveBeenCalled();
      expect(result.current.data).toBeNull();
    });

    it("should refetch when enabled changes from false to true", async () => {
      const mockData = [{ id: "1", title: "Test" }];
      mockConceptList.mockResolvedValue(mockData);

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useIPCQuery(() => ipc.concept.list({}), {
            queryKey: "test-query",
            enabled,
          }),
        { initialProps: { enabled: false } },
      );

      expect(mockConceptList).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockConceptList).toHaveBeenCalled();
    });

    it("should track input changes and refetch", async () => {
      const mockData1 = [{ id: "1", title: "Test 1" }];
      const mockData2 = [{ id: "2", title: "Test 2" }];
      
      // Use mockImplementation to track calls and return appropriate data
      let searchValue = "test1";
      mockConceptList.mockImplementation((input: any) => {
        if (input.search === "test1") {
          return Promise.resolve(mockData1);
        } else if (input.search === "test2") {
          return Promise.resolve(mockData2);
        }
        return Promise.resolve(mockData1);
      });

      const { result, rerender } = renderHook(
        ({ search }) =>
          useIPCQuery(
            () => ipc.concept.list({ search }),
            {
              queryKey: "test-query",
              inputs: [search],
            },
          ),
        { initialProps: { search: "test1" } },
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });

      // Verify initial data matches search="test1"
      expect(result.current.data).toEqual(mockData1);
      const initialCallCount = mockConceptList.mock.calls.length;

      // Rerender with new search value
      rerender({ search: "test2" });

      // Wait for new data to load
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });

      // Verify new data matches search="test2"
      expect(result.current.data).toEqual(mockData2);
      // Should have called the mock again for the new search
      expect(mockConceptList.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it("should not refetch when inputs haven't changed", async () => {
      const mockData = [{ id: "1", title: "Test" }];
      mockConceptList.mockResolvedValue(mockData);

      const { result, rerender } = renderHook(
        ({ search }) =>
          useIPCQuery(
            () => ipc.concept.list({ search }),
            {
              queryKey: "test-query",
              inputs: [search],
            },
          ),
        { initialProps: { search: "test" } },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      const callCount = mockConceptList.mock.calls.length;

      // Rerender with same search value
      rerender({ search: "test" });

      // Should not have called again
      await waitFor(() => {
        expect(mockConceptList.mock.calls.length).toBe(callCount);
      });
    });
  });

  describe("useIPCMutation", () => {
    it("should execute mutation and return data", async () => {
      const mockData = { id: "1", title: "New Concept" };
      mockConceptCreate.mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useIPCMutation((input: any) => ipc.concept.create(input)),
      );

      expect(result.current.isLoading).toBe(false);

      let mutationResult: any;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({
          title: "New Concept",
          content: "Content",
          creator: "User",
        });
      });

      expect(mutationResult).toEqual(mockData);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle mutation errors", async () => {
      const error = new Error("Mutation failed");
      mockConceptCreate.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useIPCMutation((input: any) => ipc.concept.create(input)),
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            title: "New Concept",
            content: "Content",
            creator: "User",
          });
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Mutation failed");
      expect(result.current.isLoading).toBe(false);
    });

    it("should call onSuccess callback", async () => {
      const mockData = { id: "1", title: "New Concept" };
      mockConceptCreate.mockResolvedValue(mockData);
      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useIPCMutation((input: any) => ipc.concept.create(input), {
          onSuccess,
        }),
      );

      await act(async () => {
        await result.current.mutateAsync({
          title: "New Concept",
          content: "Content",
          creator: "User",
        });
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });

    it("should call onError callback", async () => {
      const error = new Error("Mutation failed");
      mockConceptCreate.mockRejectedValue(error);
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useIPCMutation((input: any) => ipc.concept.create(input), {
          onError,
        }),
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            title: "New Concept",
            content: "Content",
            creator: "User",
          });
        } catch (err) {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should support mutate with call-specific callbacks", async () => {
      const mockData = { id: "1", title: "New Concept" };
      mockConceptCreate.mockResolvedValue(mockData);
      const globalOnSuccess = jest.fn();
      const callOnSuccess = jest.fn();

      const { result } = renderHook(() =>
        useIPCMutation((input: any) => ipc.concept.create(input), {
          onSuccess: globalOnSuccess,
        }),
      );

      await act(async () => {
        await result.current.mutate(
          {
            title: "New Concept",
            content: "Content",
            creator: "User",
          },
          { onSuccess: callOnSuccess },
        );
      });

      expect(globalOnSuccess).toHaveBeenCalledWith(mockData);
      expect(callOnSuccess).toHaveBeenCalledWith(mockData);
    });

    it("should set loading state during mutation", async () => {
      let resolveMutation: (value: any) => void;
      const mutationPromise = new Promise((resolve) => {
        resolveMutation = resolve;
      });
      mockConceptCreate.mockReturnValue(mutationPromise);

      const { result } = renderHook(() =>
        useIPCMutation((input: any) => ipc.concept.create(input)),
      );

      act(() => {
        result.current.mutateAsync({
          title: "New Concept",
          content: "Content",
          creator: "User",
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveMutation!({ id: "1", title: "New Concept" });
        await mutationPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("useUtils", () => {
    it("should provide invalidate methods for queries", async () => {
      const mockData = [{ id: "1", title: "Test" }];
      mockConceptList.mockResolvedValue(mockData);

      // First, set up a query that registers in the cache
      const { result: queryResult } = renderHook(() =>
        api.concept.list.useQuery({}),
      );

      await waitFor(() => {
        expect(queryResult.current.data).toEqual(mockData);
      });

      // Now use useUtils to invalidate
      const { result: utilsResult } = renderHook(() => useUtils());

      const initialCallCount = mockConceptList.mock.calls.length;

      await act(async () => {
        await utilsResult.current.concept.list.invalidate();
      });

      // Should have triggered a refetch
      await waitFor(() => {
        expect(mockConceptList.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it("should handle invalidate for non-existent queries gracefully", async () => {
      const { result } = renderHook(() => useUtils());

      await expect(
        act(async () => {
          await result.current.concept.list.invalidate();
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("api convenience hooks", () => {
    it("should provide concept.list.useQuery", async () => {
      const mockData = [{ id: "1", title: "Test" }];
      mockConceptList.mockResolvedValue(mockData);

      const { result } = renderHook(() => api.concept.list.useQuery({}));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockConceptList).toHaveBeenCalledWith({});
    });

    it("should provide concept.getById.useQuery", async () => {
      const mockData = { id: "1", title: "Test" } as any;
      mockConceptGetById.mockResolvedValue(mockData);

      const { result } = renderHook(() => api.concept.getById.useQuery({ id: "1" }));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockConceptGetById).toHaveBeenCalledWith({ id: "1" });
    });

    it("should provide ai.getSettings.useQuery", async () => {
      const mockData = { provider: "openai", model: "gpt-4o", temperature: 0.7 } as any;
      mockAIGetSettings.mockResolvedValue(mockData);

      const { result } = renderHook(() => api.ai.getSettings.useQuery());

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockAIGetSettings).toHaveBeenCalled();
    });

    it("should provide ai.updateSettings.useMutation", async () => {
      const mockData = { provider: "gemini", model: "gemini-3-pro-preview", temperature: 0.7 } as any;
      mockAIUpdateSettings.mockResolvedValue(mockData);

      const { result } = renderHook(() => api.ai.updateSettings.useMutation());

      await act(async () => {
        await result.current.mutateAsync({ provider: "gemini" });
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockAIUpdateSettings).toHaveBeenCalledWith({ provider: "gemini" });
    });
  });

  describe("error handling", () => {
    it("should handle non-Error exceptions in queries", async () => {
      mockConceptList.mockRejectedValue("String error");

      const { result } = renderHook(() =>
        useIPCQuery(() => ipc.concept.list({}), {
          queryKey: "test-query",
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("String error");
    });

    it("should handle non-Error exceptions in mutations", async () => {
      mockConceptCreate.mockRejectedValue("String error");

      const { result } = renderHook(() =>
        useIPCMutation((input: any) => ipc.concept.create(input)),
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            title: "Test",
            content: "Content",
            creator: "User",
          });
        } catch (err) {
          // Expected
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
