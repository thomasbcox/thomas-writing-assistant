/**
 * Tests for PDF React Query hooks
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useExtractPDFText } from "~/lib/api/pdf";

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

describe("PDF API hooks", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  describe("useExtractPDFText", () => {
    it("should extract text from PDF", async () => {
      const mockResponse = {
        text: "Extracted PDF text",
        numPages: 5,
        info: { Title: "Test PDF" },
        metadata: { Creator: "Test" },
        fileName: "test.pdf",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useExtractPDFText(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        fileData: "base64encodedpdfdata",
        fileName: "test.pdf",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true), {
        timeout: 3000,
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/pdf/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: "base64encodedpdfdata",
          fileName: "test.pdf",
        }),
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should handle extraction errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid PDF" }),
      } as Response);

      const { result } = renderHook(() => useExtractPDFText(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        fileData: "invalid",
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });
});
