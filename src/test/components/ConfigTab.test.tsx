/**
 * Component tests for ConfigTab
 * Last Updated: 2025-12-11
 */

/**
 * Component tests for ConfigTab
 * Last Updated: 2025-12-11
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ConfigTab } from "~/components/ConfigTab";
import {
  mockConfigGetStyleGuideRawUseQuery,
  mockConfigGetCredoRawUseQuery,
  mockConfigGetConstraintsRawUseQuery,
  mockConfigUpdateStyleGuideUseMutation,
  mockConfigUpdateCredoUseMutation,
  mockConfigUpdateConstraintsUseMutation,
  resetAllTRPCMocks,
} from "../utils/mock-trpc-hooks";
import { renderWithTRPC } from "../utils/test-wrapper";

// Mock tRPC react module - replace api with our proxy-based mock
jest.mock("~/lib/trpc/react", () => {
  const actual = jest.requireActual("~/lib/trpc/react");
  const { createMockTRPCAPI } = require("../utils/mock-trpc-hooks");
  return {
    ...actual,
    api: createMockTRPCAPI(), // Use proxy-based mock that intercepts hook calls
    TRPCReactProvider: actual.TRPCReactProvider, // Keep the real provider
  };
});

describe("ConfigTab - User Flows", () => {
  beforeEach(() => {
    resetAllTRPCMocks();
    // Override default config mocks for this test
    mockConfigGetStyleGuideRawUseQuery.mockReturnValue({
      data: { content: "voice:\n  tone: test" },
      isLoading: false,
      refetch: jest.fn(),
    });
    mockConfigGetCredoRawUseQuery.mockReturnValue({
      data: { content: "core_beliefs:\n  - Belief 1" },
      isLoading: false,
      refetch: jest.fn(),
    });
    mockConfigGetConstraintsRawUseQuery.mockReturnValue({
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
      expect(screen.getByText(/style guide/i)).toBeInTheDocument();
      
      // Click Credo tab
      const credoTab = screen.getByRole("button", { name: /credo/i });
      await user.click(credoTab);
      
      // Credo content should be visible
      await waitFor(() => {
        expect(screen.getByText(/credo.*values/i)).toBeInTheDocument();
      });
      
      // Click Constraints tab
      const constraintsTab = screen.getByRole("button", { name: /constraints/i });
      await user.click(constraintsTab);
      
      // Constraints content should be visible
      await waitFor(() => {
        expect(screen.getByText(/constraints.*rules/i)).toBeInTheDocument();
      });
    });
  });

  describe("Edit Style Guide Flow", () => {
    it("allows user to edit and save style guide", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      const mockRefetch = jest.fn();
      
      mockConfigGetStyleGuideRawUseQuery.mockReturnValue({
        data: { content: "voice:\n  tone: original" },
        isLoading: false,
        refetch: mockRefetch,
      });
      
      mockConfigUpdateStyleGuideUseMutation.mockReturnValue({
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
      const callbacks = mockMutate.mock.calls[0];
      if (callbacks && callbacks[1]?.onSuccess) {
        callbacks[1].onSuccess();
        
        // Success toast should appear
        await waitFor(() => {
          expect(screen.getByText(/updated.*successfully/i)).toBeInTheDocument();
        });
        
        // Refetch should be called
        expect(mockRefetch).toHaveBeenCalled();
      }
    });

    it("shows error for invalid YAML", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn((data, callbacks) => {
        if (callbacks?.onError) {
          callbacks.onError(new Error("Invalid YAML: syntax error"));
        }
      });
      
      mockConfigUpdateStyleGuideUseMutation.mockReturnValue({
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
        expect(screen.getByText(/invalid yaml|syntax error/i)).toBeInTheDocument();
      });
    });

    it("shows loading state during save", () => {
      mockConfigUpdateStyleGuideUseMutation.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
      });
      
      renderWithTRPC(<ConfigTab />);
      
      // Save button should show loading state
      const saveButton = screen.getByRole("button", { name: /saving/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveTextContent(/saving/i);
    });
  });

  describe("Edit Credo Flow", () => {
    it("allows user to edit and save credo", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      const mockRefetch = jest.fn();
      
      mockConfigGetCredoRawUseQuery.mockReturnValue({
        data: { content: "core_beliefs:\n  - Original belief" },
        isLoading: false,
        refetch: mockRefetch,
      });
      
      mockConfigUpdateCredoUseMutation.mockReturnValue({
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
      
      mockConfigGetConstraintsRawUseQuery.mockReturnValue({
        data: { content: "never_do:\n  - Original rule" },
        isLoading: false,
        refetch: jest.fn(),
      });
      
      mockConfigUpdateConstraintsUseMutation.mockReturnValue({
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
      mockConfigGetStyleGuideRawUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      });
      
      renderWithTRPC(<ConfigTab />);
      
      // Loading spinner should appear (check for aria-label)
      expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
    });
  });
});

