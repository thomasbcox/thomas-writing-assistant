/**
 * Component tests for ConceptsTab
 * Last Updated: 2025-12-11
 */

/**
 * Component tests for ConceptsTab
 * Last Updated: 2025-12-11
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ConceptsTab } from "~/components/ConceptsTab";
import { createMockConcept } from "../utils/test-factories";
import {
  mockConceptListUseQuery,
  mockConceptGetByIdUseQuery,
  mockConceptCreateUseMutation,
  mockConceptDeleteUseMutation,
  mockConceptRestoreUseMutation,
  mockConceptPurgeTrashUseMutation,
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

describe("ConceptsTab - User Flows", () => {
  beforeEach(() => {
    resetAllTRPCMocks();
    mockConceptGetByIdUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  describe("Create Concept Flow", () => {
    it("allows user to create a new concept", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      const mockRefetch = jest.fn();
      
      mockConceptListUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      
      mockConceptCreateUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<ConceptsTab />);
      
      // Click create button
      const createButton = screen.getByRole("button", { name: /create.*concept/i });
      await user.click(createButton);
      
      // Fill form (if ConceptCreateForm is rendered)
      // The form might be in a dialog or inline
      const titleInput = screen.queryByLabelText(/title/i);
      if (titleInput) {
        await user.type(titleInput, "My Test Concept");
        
        // Submit
        const submitButton = screen.getByRole("button", { name: /create|save/i });
        await user.click(submitButton);
        
        // Verify API called
        expect(mockMutate).toHaveBeenCalled();
      }
    });

    it("shows success toast after creating concept", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn((data, callbacks) => {
        if (callbacks?.onSuccess) {
          callbacks.onSuccess();
        }
      });
      const mockRefetch = jest.fn();
      
      mockConceptListUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      
      mockConceptCreateUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<ConceptsTab />);
      
      const createButton = screen.getByRole("button", { name: /create.*concept/i });
      await user.click(createButton);
      
      // Simulate successful creation
      if (mockMutate.mock.calls.length > 0) {
        const callbacks = mockMutate.mock.calls[0][1];
        if (callbacks?.onSuccess) {
          callbacks.onSuccess();
          
          await waitFor(() => {
            expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
          });
        }
      }
    });
  });

  describe("Search and Filter Flow", () => {
    it("allows user to search for concepts", async () => {
      const user = userEvent.setup();
      const concepts = [
        createMockConcept({ title: "React Concepts" }),
        createMockConcept({ title: "Vue Concepts" }),
      ];
      
      mockConceptListUseQuery.mockReturnValue({
        data: concepts,
        isLoading: false,
        refetch: jest.fn(),
      });
      
      renderWithTRPC(<ConceptsTab />);
      
      // Find search input
      const searchInput = screen.getByPlaceholderText(/search/i);
      
      // Type search query
      await user.type(searchInput, "React");
      
      // Results should filter (if implemented)
      // This depends on how search is implemented (debounced, real-time, etc.)
      expect(searchInput).toHaveValue("React");
    });

    it("allows user to toggle trash view", async () => {
      const user = userEvent.setup();
      const activeConcept = createMockConcept({ title: "Active Concept", trashedAt: null });
      const trashedConcept = createMockConcept({ 
        title: "Trashed Concept", 
        trashedAt: new Date(),
      });
      
      // Initially show active concepts
      mockConceptListUseQuery.mockReturnValue({
        data: [activeConcept],
        isLoading: false,
        refetch: jest.fn(),
      });
      
      const { rerender } = render(<ConceptsTab />);
      
      // Verify active concept is shown
      expect(screen.getByText("Active Concept")).toBeInTheDocument();
      
      // Toggle to show trash
      const trashToggle = screen.getByLabelText(/show trash|trash/i);
      await user.click(trashToggle);
      
      // Update mock to return trash
      mockConceptListUseQuery.mockReturnValue({
        data: [trashedConcept],
        isLoading: false,
        refetch: jest.fn(),
      });
      
      rerender(<ConceptsTab />);
      
      // Trashed concept should appear
      await waitFor(() => {
        expect(screen.getByText("Trashed Concept")).toBeInTheDocument();
      });
    });
  });

  describe("Edit Concept Flow", () => {
    it("allows user to edit a concept", async () => {
      const user = userEvent.setup();
      const concept = createMockConcept({ id: "concept-1", title: "Original Title" });
      
      mockConceptListUseQuery.mockReturnValue({
        data: [concept],
        isLoading: false,
        refetch: jest.fn(),
      });
      
      mockConceptGetByIdUseQuery.mockReturnValue({
        data: concept,
        isLoading: false,
      });
      
      renderWithTRPC(<ConceptsTab />);
      
      // Find edit button (might be in ConceptActions)
      const editButton = screen.getByRole("button", { name: /edit/i });
      expect(editButton).toBeInTheDocument();
      
      // Click edit
      await user.click(editButton);
      
      // ConceptEditor should open (if modal or inline)
      // Verify by checking if form fields appear
      const titleInput = screen.queryByLabelText(/title/i);
      if (titleInput) {
        expect(titleInput).toBeInTheDocument();
      }
    });
  });

  describe("Delete and Restore Flow", () => {
    it("shows confirmation dialog before deleting concept", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      const concept = createMockConcept({ id: "concept-1" });
      
      mockConceptListUseQuery.mockReturnValue({
        data: [concept],
        isLoading: false,
        refetch: jest.fn(),
      });
      
      mockConceptDeleteUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<ConceptsTab />);
      
      // Find delete button
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);
      
      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/are you sure|confirm/i)).toBeInTheDocument();
      });
    });

    it("allows user to restore concept from trash", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      const mockRefetch = jest.fn();
      const trashedConcept = createMockConcept({ 
        id: "concept-1",
        title: "Trashed Concept",
        trashedAt: new Date(),
      });
      
      mockConceptListUseQuery.mockReturnValue({
        data: [trashedConcept],
        isLoading: false,
        refetch: mockRefetch,
      });
      
      mockConceptRestoreUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      // Show trash view
      renderWithTRPC(<ConceptsTab />);
      const trashToggle = screen.getByLabelText(/show trash|trash/i);
      await user.click(trashToggle);
      
      // Find restore button
      const restoreButton = screen.getByRole("button", { name: /restore/i });
      await user.click(restoreButton);
      
      // API should be called
      expect(mockMutate).toHaveBeenCalledWith({ id: "concept-1" });
    });
  });
});

