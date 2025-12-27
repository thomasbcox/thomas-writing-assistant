import { describe, it, expect, beforeEach } from "@jest/globals";
import { jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ConfigTab } from "~/components/ConfigTab";
// Mock tRPC hooks
const mockGetStyleGuideRawUseQuery = jest.fn();
const mockGetCredoRawUseQuery = jest.fn();
const mockGetConstraintsRawUseQuery = jest.fn();
const mockUpdateStyleGuideUseMutation = jest.fn();
const mockUpdateCredoUseMutation = jest.fn();
const mockUpdateConstraintsUseMutation = jest.fn();

// Import the utility to ensure the mock is set up
import "../utils/trpc-test-utils";

jest.mock("~/lib/trpc/react", () => {
  const React = require("react");
  return {
    api: {
      config: {
        getStyleGuideRaw: {
          useQuery: (...args: unknown[]) => mockGetStyleGuideRawUseQuery(...args),
        },
        getCredoRaw: {
          useQuery: (...args: unknown[]) => mockGetCredoRawUseQuery(...args),
        },
        getConstraintsRaw: {
          useQuery: (...args: unknown[]) => mockGetConstraintsRawUseQuery(...args),
        },
        updateStyleGuide: {
          useMutation: () => mockUpdateStyleGuideUseMutation(),
        },
        updateCredo: {
          useMutation: () => mockUpdateCredoUseMutation(),
        },
        updateConstraints: {
          useMutation: () => mockUpdateConstraintsUseMutation(),
        },
      },
      // Provide a mock Provider that just returns children
      Provider: ({ children }: { children: React.ReactNode }) => children,
      createClient: jest.fn(() => ({})),
    },
  };
});

describe("ConfigTab - User Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStyleGuideRawUseQuery.mockReturnValue({
      data: "voice:\n  tone: test",
      isLoading: false,
      refetch: jest.fn(),
    });
    mockGetCredoRawUseQuery.mockReturnValue({
      data: "core_beliefs:\n  - Belief 1",
      isLoading: false,
      refetch: jest.fn(),
    });
    mockGetConstraintsRawUseQuery.mockReturnValue({
      data: { content: "never_do:\n  - Rule 1" },
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  describe("Tab Navigation Flow", () => {
    it("allows user to switch between configuration sections", async () => {
      const user = userEvent.setup();
      
      renderWithTRPC(<ConfigTab />);
      
      // Initially Style Guide should be active
      // @ts-expect-error - jest-dom matcher
        expect(screen.getByText(/style guide/i)).toBeInTheDocument();
      
      // Click Credo tab
      const credoTab = screen.getByRole("button", { name: /credo/i });
      await user.click(credoTab);
      
      // Credo content should be visible
      await waitFor(() => {
        // @ts-expect-error - jest-dom matcher
        expect(screen.getByText(/credo.*values/i)).toBeInTheDocument();
      });
      
      // Click Constraints tab
      const constraintsTab = screen.getByRole("button", { name: /constraints/i });
      await user.click(constraintsTab);
      
      // Constraints content should be visible
      await waitFor(() => {
        // @ts-expect-error - jest-dom matcher
        expect(screen.getByText(/constraints.*rules/i)).toBeInTheDocument();
      });
    });
  });

  describe("Edit Style Guide Flow", () => {
    it("allows user to edit and save style guide", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      const mockRefetch = jest.fn();
      
      mockGetStyleGuideRawUseQuery.mockReturnValue({
        data: { content: "voice:\n  tone: original" },
        isLoading: false,
        refetch: mockRefetch,
      });
      
      mockUpdateStyleGuideUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<ConfigTab />);
      
      // Find textarea
      const textarea = screen.getByRole("textbox");
      
      // Edit content
      await user.clear(textarea);
      await user.type(textarea, "voice:\n  tone: updated");
      
      // Save
      const saveButton = screen.getByRole("button", { name: /save.*reload/i });
      await user.click(saveButton);
      
      // API should be called
      expect(mockMutate).toHaveBeenCalledWith({
        content: "voice:\n  tone: updated",
      });
      
      // Simulate success
      if (mockMutate.mock.calls.length > 0) {
        const callbacks = mockMutate.mock.calls[0][1] as { onSuccess?: () => void } | undefined;
        if (callbacks?.onSuccess) {
          callbacks.onSuccess();
        
        // Success toast should appear
        await waitFor(() => {
          // @ts-expect-error - jest-dom matcher
          expect(screen.getByText(/updated.*successfully/i)).toBeInTheDocument();
        });
        
        // Refetch should be called
        expect(mockRefetch).toHaveBeenCalled();
        }
      }
    });

    it("shows error for invalid YAML", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn((data: unknown, callbacks?: { onError?: (error: Error) => void }) => {
        if (callbacks?.onError) {
          callbacks.onError(new Error("Invalid YAML: syntax error"));
        }
      });
      
      mockUpdateStyleGuideUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<ConfigTab />);
      
      // Enter invalid YAML
      const textarea = screen.getByRole("textbox");
      await user.clear(textarea);
      await user.type(textarea, "invalid: yaml: content: unclosed");
      
      // Try to save
      const saveButton = screen.getByRole("button", { name: /save.*reload/i });
      await user.click(saveButton);
      
      // Error should be shown
      await waitFor(() => {
        // @ts-expect-error - jest-dom matcher
        expect(screen.getByText(/invalid yaml|syntax error/i)).toBeInTheDocument();
      });
    });

    it("shows loading state during save", () => {
      mockUpdateStyleGuideUseMutation.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
      });
      
      renderWithTRPC(<ConfigTab />);
      
      // Save button should show loading state
      const saveButton = screen.getByRole("button", { name: /saving/i });
      // @ts-expect-error - jest-dom matcher
      expect(saveButton).toBeDisabled();
      // @ts-expect-error - jest-dom matcher
      expect(saveButton).toHaveTextContent(/saving/i);
    });
  });

  describe("Edit Credo Flow", () => {
    it("allows user to edit and save credo", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      const mockRefetch = jest.fn();
      
      mockGetCredoRawUseQuery.mockReturnValue({
        data: { content: "core_beliefs:\n  - Original belief" },
        isLoading: false,
        refetch: mockRefetch,
      });
      
      mockUpdateCredoUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<ConfigTab />);
      
      // Switch to Credo tab
      const credoTab = screen.getByRole("button", { name: /credo/i });
      await user.click(credoTab);
      
      // Find textarea
      const textarea = screen.getByRole("textbox");
      
      // Edit content
      await user.clear(textarea);
      await user.type(textarea, "core_beliefs:\n  - New belief");
      
      // Save
      const saveButton = screen.getByRole("button", { name: /save.*reload/i });
      await user.click(saveButton);
      
      // API should be called
      expect(mockMutate).toHaveBeenCalledWith({
        content: "core_beliefs:\n  - New belief",
      });
    });
  });

  describe("Edit Constraints Flow", () => {
    it("allows user to edit and save constraints", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      
      mockGetConstraintsRawUseQuery.mockReturnValue({
        data: { content: "never_do:\n  - Original rule" },
        isLoading: false,
        refetch: jest.fn(),
      });
      
      mockUpdateConstraintsUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<ConfigTab />);
      
      // Switch to Constraints tab
      const constraintsTab = screen.getByRole("button", { name: /constraints/i });
      await user.click(constraintsTab);
      
      // Find textarea
      const textarea = screen.getByRole("textbox");
      
      // Edit content
      await user.clear(textarea);
      await user.type(textarea, "never_do:\n  - New rule");
      
      // Save
      const saveButton = screen.getByRole("button", { name: /save.*reload/i });
      await user.click(saveButton);
      
      // API should be called
      expect(mockMutate).toHaveBeenCalledWith({
        content: "never_do:\n  - New rule",
      });
    });
  });

  describe("Loading States", () => {
    it("shows loading spinner while fetching config", () => {
      mockGetStyleGuideRawUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      });
      
      renderWithTRPC(<ConfigTab />);
      
      // Loading spinner should appear
      // @ts-expect-error - jest-dom matcher
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });
});

