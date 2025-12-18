/**
 * Tests for Config React Query hooks
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useConfigStatus,
  useStyleGuide,
  useStyleGuideRaw,
  useUpdateStyleGuide,
  useCredo,
  useCredoRaw,
  useUpdateCredo,
  useConstraints,
  useConstraintsRaw,
  useUpdateConstraints,
} from "~/lib/api/config";

// Mock fetch - but MSW will intercept, so we need to disable MSW or use it
// For now, let's use fetch mock and disable MSW for these tests
jest.mock("~/test/mocks/server", () => ({
  server: {
    listen: jest.fn(),
    close: jest.fn(),
    resetHandlers: jest.fn(),
  },
}));

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
beforeEach(() => {
  // Replace global fetch for these tests
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

describe("Config API hooks", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("useConfigStatus", () => {
    it("should fetch config status", async () => {
      const mockStatus = {
        styleGuide: { loaded: true, isEmpty: false },
        credo: { loaded: true, isEmpty: false },
        constraints: { loaded: true, isEmpty: false },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      } as Response);

      const { result } = renderHook(() => useConfigStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockStatus);
      expect(fetchMock).toHaveBeenCalledWith("/api/config/status");
    });
  });

  describe("useStyleGuide", () => {
    it("should fetch style guide", async () => {
      const mockStyleGuide = {
        voice: { tone: "professional" },
        writing_style: { format: "structured" },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStyleGuide,
      } as Response);

      const { result } = renderHook(() => useStyleGuide(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockStyleGuide);
      expect(fetchMock).toHaveBeenCalledWith("/api/config/style-guide");
    });
  });

  describe("useStyleGuideRaw", () => {
    it("should fetch raw style guide", async () => {
      const mockRaw = {
        content: "voice:\n  tone: professional",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRaw,
      } as Response);

      const { result } = renderHook(() => useStyleGuideRaw(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockRaw);
      expect(fetchMock).toHaveBeenCalledWith("/api/config/style-guide?raw=true");
    });
  });

  describe("useUpdateStyleGuide", () => {
    it("should update style guide", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useUpdateStyleGuide(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        content: "voice:\n  tone: updated",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/config/style-guide", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "voice:\n  tone: updated",
        }),
      });
    });
  });

  describe("useCredo", () => {
    it("should fetch credo", async () => {
      const mockCredo = {
        core_beliefs: ["Value 1", "Value 2"],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCredo,
      } as Response);

      const { result } = renderHook(() => useCredo(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCredo);
      expect(fetchMock).toHaveBeenCalledWith("/api/config/credo");
    });
  });

  describe("useUpdateCredo", () => {
    it("should update credo", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useUpdateCredo(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        content: "core_beliefs:\n  - Updated value",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/config/credo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "core_beliefs:\n  - Updated value",
        }),
      });
    });
  });

  describe("useConstraints", () => {
    it("should fetch constraints", async () => {
      const mockConstraints = {
        never_do: ["Never this"],
        always_do: ["Always this"],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConstraints,
      } as Response);

      const { result } = renderHook(() => useConstraints(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockConstraints);
      expect(fetchMock).toHaveBeenCalledWith("/api/config/constraints");
    });
  });

  describe("useUpdateConstraints", () => {
    it("should update constraints", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useUpdateConstraints(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        content: "never_do:\n  - Updated constraint",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/config/constraints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "never_do:\n  - Updated constraint",
        }),
      });
    });
  });
});

