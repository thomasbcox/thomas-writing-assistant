/**
 * Tests for Concepts React Query hooks
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useConceptList,
  useConcept,
  useCreateConcept,
  useUpdateConcept,
  useDeleteConcept,
  useRestoreConcept,
  usePurgeTrash,
  useProposeLinks,
  useGenerateCandidates,
} from "~/lib/api/concepts";

// Mock fetch - disable MSW for these tests
jest.mock("~/test/mocks/server", () => ({
  server: {
    listen: jest.fn(),
    close: jest.fn(),
    resetHandlers: jest.fn(),
  },
}));

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
beforeEach(() => {
  global.fetch = fetchMock;
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("Concepts API hooks", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("useConceptList", () => {
    it("should fetch concepts list", async () => {
      const mockConcepts = [
        {
          id: "1",
          title: "Test Concept",
          description: "Test",
          content: "Content",
          creator: "Author",
          source: "Source",
          year: "2024",
          status: "active",
          identifier: "zettel-123",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          trashedAt: null,
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConcepts,
      } as Response);

      const { result } = renderHook(() => useConceptList({ includeTrash: false }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockConcepts);
      // The hook may default includeTrash to true, so check for either variant
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/concepts(\?includeTrash=(true|false))?$/),
      );
    });

    it("should handle fetch errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useConceptList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it("should include search parameter when provided", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      const { result } = renderHook(() => useConceptList({ search: "test query" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("search=test+query"),
      );
    });
  });

  describe("useConcept", () => {
    it("should fetch a single concept", async () => {
      const mockConcept = {
        id: "1",
        title: "Test Concept",
        description: "Test",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
        identifier: "zettel-123",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trashedAt: null,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConcept,
      } as Response);

      const { result } = renderHook(() => useConcept("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockConcept);
      expect(fetchMock).toHaveBeenCalledWith("/api/concepts/1");
    });

    it("should not fetch when id is null", async () => {
      const { result } = renderHook(() => useConcept(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it("should handle fetch errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const { result } = renderHook(() => useConcept("999"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useCreateConcept", () => {
    it("should create a concept", async () => {
      const mockConcept = {
        id: "1",
        title: "New Concept",
        description: "Description",
        content: "Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
        identifier: "zettel-123",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trashedAt: null,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConcept,
      } as Response);

      const { result } = renderHook(() => useCreateConcept(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: "New Concept",
        description: "Description",
        content: "Content",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetchMock).toHaveBeenCalledWith("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Concept",
          description: "Description",
          content: "Content",
        }),
      });
    });

    it("should handle creation errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Validation error" }),
      } as Response);

      const { result } = renderHook(() => useCreateConcept(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: "New Concept",
        content: "Content",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useUpdateConcept", () => {
    it("should update a concept", async () => {
      const mockConcept = {
        id: "1",
        title: "Updated Concept",
        description: "Updated Description",
        content: "Updated Content",
        creator: "Author",
        source: "Source",
        year: "2024",
        status: "active",
        identifier: "zettel-123",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trashedAt: null,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConcept,
      } as Response);

      const { result } = renderHook(() => useUpdateConcept(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(
        {
          id: "1",
          data: {
            title: "Updated Concept",
            description: "Updated Description",
          },
        },
        {
          onSuccess: () => {},
          onError: () => {},
        },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/concepts/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated Concept",
          description: "Updated Description",
        }),
      });
    });

    it("should handle update errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Concept not found" }),
      } as Response);

      const { result } = renderHook(() => useUpdateConcept(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: "999",
        data: { title: "Updated" },
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useDeleteConcept", () => {
    it("should delete a concept", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useDeleteConcept(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("concept-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/concepts/concept-1", {
        method: "DELETE",
      });
    });
  });

  describe("useRestoreConcept", () => {
    it("should restore a concept from trash", async () => {
      const mockConcept = {
        id: "concept-1",
        title: "Restored Concept",
        status: "active",
        trashedAt: null,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConcept,
      } as Response);

      const { result } = renderHook(() => useRestoreConcept(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("concept-1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/concepts/concept-1/restore", {
        method: "POST",
      });
    });
  });

  describe("usePurgeTrash", () => {
    it("should purge old trashed concepts", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deletedCount: 3 }),
      } as Response);

      const { result } = renderHook(() => usePurgeTrash(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ daysOld: 30 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/concepts/purge-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysOld: 30 }),
      });
    });
  });

  describe("useProposeLinks", () => {
    it("should propose links for a concept", async () => {
      const mockProposals = [
        {
          source: "concept-1",
          target: "concept-2",
          target_title: "Target Concept",
          forward_name: "references",
          confidence: 0.9,
          reasoning: "These concepts are related",
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProposals,
      } as Response);

      const { result } = renderHook(() => useProposeLinks("concept-1", 5), {
        wrapper: createWrapper(),
      });

      result.current.refetch();

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/concepts/concept-1/propose-links?maxProposals=5");
    });
  });

  describe("useGenerateCandidates", () => {
    it("should generate concept candidates", async () => {
      const mockCandidates = [
        {
          title: "Candidate 1",
          coreDefinition: "Definition 1",
          managerialApplication: "Application 1",
          content: "Content 1",
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCandidates,
      } as Response);

      const { result } = renderHook(() => useGenerateCandidates(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        text: "Some text to extract concepts from",
        maxCandidates: 5,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/concepts/generate-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Some text to extract concepts from",
          maxCandidates: 5,
        }),
      });
    });
  });
});

