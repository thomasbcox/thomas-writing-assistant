/**
 * Tests for Capsules React Query hooks
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useCapsuleList,
  useCapsule,
  useCreateCapsule,
  useCreateAnchor,
  useUpdateAnchor,
  useDeleteAnchor,
  useCreateAnchorFromPDF,
  useCreateRepurposedContent,
  useUpdateRepurposedContent,
  useDeleteRepurposedContent,
  useRegenerateRepurposedContent,
} from "~/lib/api/capsules";

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

describe("Capsules API hooks", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("useCapsuleList", () => {
    it("should fetch capsules list", async () => {
      const mockCapsules = [
        {
          id: "1",
          title: "Test Capsule",
          promise: "Promise",
          cta: "CTA",
          offerMapping: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCapsules,
      } as Response);

      const { result } = renderHook(() => useCapsuleList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCapsules);
      expect(fetchMock).toHaveBeenCalledWith("/api/capsules");
    });
  });

  describe("useCapsule", () => {
    it("should fetch a single capsule", async () => {
      const mockCapsule = {
        id: "1",
        title: "Test Capsule",
        promise: "Promise",
        cta: "CTA",
        offerMapping: null,
        anchors: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCapsule,
      } as Response);

      const { result } = renderHook(() => useCapsule("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCapsule);
      expect(fetchMock).toHaveBeenCalledWith("/api/capsules/1");
    });

    it("should not fetch when id is null", async () => {
      const { result } = renderHook(() => useCapsule(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("useCreateCapsule", () => {
    it("should create a capsule", async () => {
      const mockCapsule = {
        id: "1",
        title: "New Capsule",
        promise: "New promise",
        cta: "New CTA",
        offerMapping: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCapsule,
      } as Response);

      const { result } = renderHook(() => useCreateCapsule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: "New Capsule",
        promise: "New promise",
        cta: "New CTA",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Capsule",
          promise: "New promise",
          cta: "New CTA",
        }),
      });
    });
  });

  describe("useCreateAnchor", () => {
    it("should create an anchor", async () => {
      const mockAnchor = {
        id: "anchor-1",
        capsuleId: "capsule-1",
        title: "New Anchor",
        content: "Anchor content",
        createdAt: new Date().toISOString(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnchor,
      } as Response);

      const { result } = renderHook(() => useCreateAnchor(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        capsuleId: "capsule-1",
        data: {
          title: "New Anchor",
          content: "Anchor content",
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/capsules/capsule-1/anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Anchor",
          content: "Anchor content",
        }),
      });
    });
  });

  describe("useUpdateAnchor", () => {
    it("should update an anchor", async () => {
      const mockAnchor = {
        id: "anchor-1",
        title: "Updated Anchor",
        content: "Updated content",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnchor,
      } as Response);

      const { result } = renderHook(() => useUpdateAnchor(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        capsuleId: "capsule-1",
        anchorId: "anchor-1",
        data: {
          title: "Updated Anchor",
          content: "Updated content",
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/capsules/capsule-1/anchors/anchor-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated Anchor",
          content: "Updated content",
        }),
      });
    });
  });

  describe("useDeleteAnchor", () => {
    it("should delete an anchor", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useDeleteAnchor(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        capsuleId: "capsule-1",
        anchorId: "anchor-1",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/capsules/capsule-1/anchors/anchor-1", {
        method: "DELETE",
      });
    });
  });

  describe("useCreateRepurposedContent", () => {
    it("should create repurposed content", async () => {
      const mockRepurposed = {
        id: "repurposed-1",
        anchorId: "anchor-1",
        type: "social_post",
        content: "Social post content",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepurposed,
      } as Response);

      const { result } = renderHook(() => useCreateRepurposedContent(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        capsuleId: "capsule-1",
        anchorId: "anchor-1",
        data: {
          type: "social_post",
          content: "Social post content",
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/capsules/capsule-1/anchors/anchor-1/repurposed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "social_post",
          content: "Social post content",
        }),
      });
    });
  });

  describe("useUpdateRepurposedContent", () => {
    it("should update repurposed content", async () => {
      const mockRepurposed = {
        id: "repurposed-1",
        type: "email",
        content: "Updated email content",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepurposed,
      } as Response);

      const { result } = renderHook(() => useUpdateRepurposedContent(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        capsuleId: "capsule-1",
        anchorId: "anchor-1",
        repurposedId: "repurposed-1",
        data: {
          type: "email",
          content: "Updated email content",
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/capsules/capsule-1/anchors/anchor-1/repurposed/repurposed-1",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "email",
            content: "Updated email content",
          }),
        },
      );
    });
  });

  describe("useDeleteRepurposedContent", () => {
    it("should delete repurposed content", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useDeleteRepurposedContent(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        capsuleId: "capsule-1",
        anchorId: "anchor-1",
        repurposedId: "repurposed-1",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/capsules/capsule-1/anchors/anchor-1/repurposed/repurposed-1",
        {
          method: "DELETE",
        },
      );
    });
  });

  describe("useRegenerateRepurposedContent", () => {
    it("should regenerate all repurposed content", async () => {
      const mockResponse = {
        repurposedContent: [
          {
            id: "repurposed-1",
            type: "social_post",
            content: "New content",
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useRegenerateRepurposedContent(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        capsuleId: "capsule-1",
        anchorId: "anchor-1",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/capsules/capsule-1/anchors/anchor-1/repurposed/regenerate-all",
        {
          method: "POST",
        },
      );
    });
  });

  // Note: useUpdateCapsule and useDeleteCapsule are not exported from capsules.ts
  // These endpoints don't exist in the API routes (capsules are immutable containers)
});

