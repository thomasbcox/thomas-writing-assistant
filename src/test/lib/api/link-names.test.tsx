/**
 * Tests for Link Names React Query hooks
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useLinkNames,
  useCreateLinkName,
  useUpdateLinkName,
  useDeleteLinkName,
  useLinkNameUsage,
} from "~/lib/api/link-names";

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

describe("Link Names API hooks", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("useLinkNames", () => {
    it("should fetch link names", async () => {
      const mockLinkNames = ["references", "builds on", "custom-relation"];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLinkNames,
      } as Response);

      const { result } = renderHook(() => useLinkNames(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockLinkNames);
      expect(fetchMock).toHaveBeenCalledWith("/api/link-names");
    });
  });

  describe("useCreateLinkName", () => {
    it("should create a link name", async () => {
      const mockLinkName = {
        id: "1",
        name: "new-relation",
        isDefault: false,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLinkName,
      } as Response);

      const { result } = renderHook(() => useCreateLinkName(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "new-relation" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/link-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "new-relation" }),
      });
    });
  });

  describe("useUpdateLinkName", () => {
    it("should update a link name", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updatedCount: 5, success: true }),
      } as Response);

      const { result } = renderHook(() => useUpdateLinkName(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ oldName: "old-name", newName: "new-name" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/link-names/old-name", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: "new-name" }),
      });
    });
  });

  describe("useDeleteLinkName", () => {
    it("should delete a link name", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, deletedCount: 0 }),
      } as Response);

      const { result } = renderHook(() => useDeleteLinkName(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "custom-name" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      // The hook URL-encodes the name
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/link-names/custom-name"),
        {
          method: "DELETE",
        },
      );
    });

    it("should delete with replacement", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, deletedCount: 3 }),
      } as Response);

      const { result } = renderHook(() => useDeleteLinkName(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "old-name", replaceWith: "new-name" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/link-names/old-name?replaceWith=new-name"),
        {
          method: "DELETE",
        },
      );
    });
  });

  describe("useLinkNameUsage", () => {
    it("should fetch link name usage", async () => {
      const mockUsage = {
        name: "references",
        count: 5,
        links: [
          {
            id: "link-1",
            sourceId: "concept-1",
            targetId: "concept-2",
            sourceTitle: "Source",
            targetTitle: "Target",
          },
        ],
        isDefault: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsage,
      } as Response);

      const { result } = renderHook(() => useLinkNameUsage("references"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockUsage);
      // The hook calls /usage but route is at [name] - this may be a mismatch
      expect(fetchMock).toHaveBeenCalledWith("/api/link-names/references/usage");
    });

    it("should not fetch when name is null", async () => {
      const { result } = renderHook(() => useLinkNameUsage(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
