/**
 * Tests for AI React Query hooks
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useAISettings, useUpdateAISettings, useAvailableModels } from "~/lib/api/ai";

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

describe("AI API hooks", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("useAISettings", () => {
    it("should fetch AI settings", async () => {
      const mockSettings = {
        provider: "openai",
        model: "gpt-4o-mini",
        temperature: 0.7,
        availableProviders: {
          openai: true,
          gemini: false,
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      } as Response);

      const { result } = renderHook(() => useAISettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSettings);
      expect(fetchMock).toHaveBeenCalledWith("/api/ai/settings");
    });
  });

  describe("useUpdateAISettings", () => {
    it("should update AI settings", async () => {
      const mockUpdated = {
        provider: "gemini",
        model: "gemini-1.5-flash",
        temperature: 0.8,
        availableProviders: {
          openai: true,
          gemini: true,
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdated,
      } as Response);

      const { result } = renderHook(() => useUpdateAISettings(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        provider: "gemini",
        model: "gemini-1.5-flash",
        temperature: 0.8,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gemini",
          model: "gemini-1.5-flash",
          temperature: 0.8,
        }),
      });
    });
  });

  describe("useAvailableModels", () => {
    it("should fetch available models", async () => {
      const mockModels = {
        provider: "openai",
        models: [
          { value: "gpt-4o-mini", label: "GPT-4o Mini" },
          { value: "gpt-4o", label: "GPT-4o" },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels,
      } as Response);

      const { result } = renderHook(() => useAvailableModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockModels);
      expect(fetchMock).toHaveBeenCalledWith("/api/ai/models");
    });
  });
});
