/**
 * Tests for Links React Query hooks
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useLinks, useLinksByConcept, useCreateLink, useDeleteLink } from "~/lib/api/links";

// Mock fetch - disable MSW for these tests
jest.mock("~/test/mocks/server", () => ({
  server: {
    listen: jest.fn(),
    close: jest.fn(),
    resetHandlers: jest.fn(),
  },
}));

const fetchMock = jest.fn();
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

describe("Links API hooks", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("useLinks", () => {
    it("should fetch all links", async () => {
      const mockLinks = [
        {
          id: "1",
          sourceId: "concept-1",
          targetId: "concept-2",
          forwardName: "references",
          reverseName: "referenced by",
          notes: null,
          createdAt: new Date().toISOString(),
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLinks,
      } as Response);

      const { result } = renderHook(() => useLinks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockLinks);
      expect(fetchMock).toHaveBeenCalledWith("/api/links");
    });
  });

  describe("useLinksByConcept", () => {
    it("should fetch links for a concept", async () => {
      const mockLinksResponse = {
        outgoing: [
          {
            id: "1",
            sourceId: "concept-1",
            targetId: "concept-2",
            forwardName: "references",
            reverseName: "referenced by",
            notes: null,
            createdAt: new Date().toISOString(),
            target: { id: "concept-2", title: "Target" },
            source: { id: "concept-1", title: "Source" },
          },
        ],
        incoming: [],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLinksResponse,
      } as Response);

      const { result } = renderHook(() => useLinksByConcept("concept-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(result.current.data).toEqual(mockLinksResponse);
      expect(fetchMock).toHaveBeenCalledWith("/api/links?conceptId=concept-1");
    });

    it("should not fetch when conceptId is null", async () => {
      const { result } = renderHook(() => useLinksByConcept(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("useCreateLink", () => {
    it("should create a link", async () => {
      const mockLink = {
        id: "1",
        sourceId: "concept-1",
        targetId: "concept-2",
        forwardName: "references",
        reverseName: "referenced by",
        notes: "Test note",
        createdAt: new Date().toISOString(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLink,
      } as Response);

      const { result } = renderHook(() => useCreateLink(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        sourceId: "concept-1",
        targetId: "concept-2",
        forwardName: "references",
        reverseName: "referenced by",
        notes: "Test note",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: "concept-1",
          targetId: "concept-2",
          forwardName: "references",
          reverseName: "referenced by",
          notes: "Test note",
        }),
      });
    });
  });

  describe("useDeleteLink", () => {
    it("should delete a link", async () => {
      const mockLink = {
        id: "1",
        sourceId: "concept-1",
        targetId: "concept-2",
        forwardName: "references",
        reverseName: "referenced by",
        createdAt: new Date().toISOString(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLink,
      } as Response);

      const { result } = renderHook(() => useDeleteLink(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        sourceId: "concept-1",
        targetId: "concept-2",
      });

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      }, {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/links/concept-1/concept-2", {
        method: "DELETE",
      });
    });
  });
});

