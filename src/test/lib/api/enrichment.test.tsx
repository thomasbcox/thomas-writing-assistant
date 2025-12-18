/**
 * Tests for Enrichment React Query hooks
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useAnalyzeConcept,
  useEnrichMetadata,
  useChatEnrich,
  useExpandDefinition,
} from "~/lib/api/enrichment";

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

describe("Enrichment API hooks", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("useAnalyzeConcept", () => {
    it("should analyze a concept", async () => {
      const mockResponse = {
        suggestions: [
          {
            id: "1",
            field: "creator" as const,
            currentValue: "",
            suggestedValue: "Author",
            reason: "Missing creator",
            confidence: "high" as const,
          },
        ],
        quickActions: [
          {
            id: "1",
            label: "Fetch Metadata",
            description: "Fetch metadata",
            action: "fetchMetadata" as const,
          },
        ],
        initialMessage: "I can help improve this concept",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useAnalyzeConcept(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: "Test Concept",
        description: "Description",
        content: "Content",
        creator: "",
        source: "",
        year: "",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/enrichment/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Concept",
          description: "Description",
          content: "Content",
          creator: "",
          source: "",
          year: "",
        }),
      });
    });
  });

  describe("useEnrichMetadata", () => {
    it("should enrich metadata", async () => {
      const mockResponse = {
        creator: "Test Author",
        year: "2024",
        source: "Test Source",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useEnrichMetadata(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: "Test Concept",
        description: "Description",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/enrichment/enrich-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Concept",
          description: "Description",
        }),
      });
    });
  });

  describe("useChatEnrich", () => {
    it("should handle chat enrichment", async () => {
      const mockResponse = {
        response: "Here's how to improve your concept",
        suggestions: [],
        actions: [],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useChatEnrich(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        message: "How can I improve this?",
        conceptData: {
          title: "Test Concept",
          description: "Description",
          content: "Content",
          creator: "",
          source: "",
          year: "",
        },
        chatHistory: [],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/enrichment/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("How can I improve this?"),
      });
    });
  });

  describe("useExpandDefinition", () => {
    it("should expand a definition", async () => {
      const mockResponse = {
        expanded: "Expanded definition with more detail",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useExpandDefinition(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        currentDefinition: "Short definition",
        conceptTitle: "Test Concept",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/enrichment/expand-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentDefinition: "Short definition",
          conceptTitle: "Test Concept",
        }),
      });
    });
  });
});
