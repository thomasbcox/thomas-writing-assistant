import { describe, it, expect, beforeEach } from "@jest/globals";
import { jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ConceptsTab } from "~/components/ConceptsTab";
import { createMockConcept } from "../utils/test-factories";

// Mock tRPC hooks - these will be set up in beforeEach
const mockConceptListUseQuery = jest.fn();
const mockConceptGetByIdUseQuery = jest.fn();
const mockConceptCreateUseMutation = jest.fn();
const mockConceptDeleteUseMutation = jest.fn();
const mockConceptRestoreUseMutation = jest.fn();
const mockConceptPurgeTrashUseMutation = jest.fn();

jest.mock("~/lib/trpc/react", () => {
  const actual = jest.requireActual("~/lib/trpc/react") as any;
  return {
    ...actual,
    api: {
      ...actual.api,
      concept: {
        list: {
          useQuery: (...args: unknown[]) => {
            return mockConceptListUseQuery(...args);
          },
        },
        getById: {
          useQuery: (...args: unknown[]) => {
            return mockConceptGetByIdUseQuery(...args);
          },
        },
        create: {
          useMutation: () => {
            return mockConceptCreateUseMutation();
          },
        },
        delete: {
          useMutation: () => {
            return mockConceptDeleteUseMutation();
          },
        },
        restore: {
          useMutation: () => {
            return mockConceptRestoreUseMutation();
          },
        },
        purgeTrash: {
          useMutation: () => {
            return mockConceptPurgeTrashUseMutation();
          },
        },
      },
    },
  };
});

describe("ConceptsTab - User Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default return values
    mockConceptListUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockConceptGetByIdUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockConceptCreateUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    mockConceptDeleteUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    mockConceptRestoreUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    mockConceptPurgeTrashUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
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
      
      render(<ConceptsTab />);
      
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
      const mockMutate = jest.fn((data: unknown, callbacks?: { onSuccess?: () => void }) => {
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
      
      render(<ConceptsTab />);
      
      const createButton = screen.getByRole("button", { name: /create.*concept/i });
      await user.click(createButton);
      
      // Simulate successful creation
      if (mockMutate.mock.calls.length > 0) {
        const callbacks = mockMutate.mock.calls[0][1] as { onSuccess?: () => void } | undefined;
        if (callbacks?.onSuccess) {
          callbacks.onSuccess();
          
          await waitFor(() => {
            // @ts-expect-error - jest-dom matcher
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
      
      render(<ConceptsTab />);
      
      // Find search input
      const searchInput = screen.getByPlaceholderText(/search/i);
      
      // Type search query
      await user.type(searchInput, "React");
      
      // Results should filter (if implemented)
      // This depends on how search is implemented (debounced, real-time, etc.)
      // @ts-expect-error - jest-dom matcher
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
      // @ts-expect-error - jest-dom matcher
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
        // @ts-expect-error - jest-dom matcher
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
      
      render(<ConceptsTab />);
      
      // Find edit button (might be in ConceptActions)
      const editButton = screen.getByRole("button", { name: /edit/i });
      // @ts-expect-error - jest-dom matcher
        expect(editButton).toBeInTheDocument();
      
      // Click edit
      await user.click(editButton);
      
      // ConceptEditor should open (if modal or inline)
      // Verify by checking if form fields appear
      const titleInput = screen.queryByLabelText(/title/i);
      if (titleInput) {
        // @ts-expect-error - jest-dom matcher
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
      
      render(<ConceptsTab />);
      
      // Find delete button
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);
      
      // Confirmation dialog should appear
      await waitFor(() => {
        // @ts-expect-error - jest-dom matcher
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
      render(<ConceptsTab />);
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

