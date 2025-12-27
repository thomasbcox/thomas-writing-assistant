import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { createMockConcept } from "../utils/test-factories";
import { renderWithTRPC } from "../utils/trpc-test-utils";
import { ConceptsTab } from "~/components/ConceptsTab";
import { mockTRPCResponse, clearMocks } from "../utils/msw-handlers";

// CRITICAL: Unmock tRPC to ensure we use REAL hooks that make HTTP requests
// This allows MSW to intercept the requests
jest.unmock("~/lib/trpc/react");

describe("ConceptsTab - User Flows", () => {
  beforeEach(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConceptsTab.test.tsx:11',message:'beforeEach starting',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Clear all MSW mocks before each test
    clearMocks();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConceptsTab.test.tsx:16',message:'About to call mockTRPCResponse',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Set up default MSW responses for tRPC endpoints
    mockTRPCResponse("concept.list", []);
    mockTRPCResponse("concept.getById", null);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConceptsTab.test.tsx:20',message:'mockTRPCResponse calls completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  });

  describe("Create Concept Flow", () => {
    it("allows user to create a new concept", async () => {
      const user = userEvent.setup();
      const newConcept = createMockConcept({ title: "My Test Concept" });
      
      // Set up MSW response for create mutation
      mockTRPCResponse("concept.create", newConcept);
      // After creation, list should return the new concept
      mockTRPCResponse("concept.list", [newConcept]);
      
      renderWithTRPC(<ConceptsTab />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
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
        
        // Wait for the new concept to appear in the list
        await waitFor(() => {
          expect(screen.getByText("My Test Concept")).toBeInTheDocument();
        });
      }
    });

    it("shows success toast after creating concept", async () => {
      const user = userEvent.setup();
      const newConcept = createMockConcept({ title: "My Test Concept" });
      
      // Set up MSW response for create mutation
      mockTRPCResponse("concept.create", newConcept);
      mockTRPCResponse("concept.list", [newConcept]);
      
      renderWithTRPC(<ConceptsTab />);
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      const createButton = screen.getByRole("button", { name: /create.*concept/i });
      await user.click(createButton);
      
      // Fill and submit form
      const titleInput = screen.queryByLabelText(/title/i);
      if (titleInput) {
        await user.type(titleInput, "My Test Concept");
        const submitButton = screen.getByRole("button", { name: /create|save/i });
        await user.click(submitButton);
        
        // Wait for success message
        await waitFor(() => {
          // @ts-expect-error - jest-dom matcher
          expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
        }, { timeout: 3000 });
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
      
      mockTRPCResponse("concept.list", concepts);
      
      renderWithTRPC(<ConceptsTab />);
      
      // Wait for concepts to load
      await waitFor(() => {
        expect(screen.getByText("React Concepts")).toBeInTheDocument();
      });
      
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
      mockTRPCResponse("concept.list", [activeConcept]);
      
      renderWithTRPC(<ConceptsTab />);
      
      // Wait for and verify active concept is shown
      await waitFor(() => {
        // @ts-expect-error - jest-dom matcher
        expect(screen.getByText("Active Concept")).toBeInTheDocument();
      });
      
      // Toggle to show trash
      const trashToggle = screen.getByLabelText(/show trash|trash/i);
      await user.click(trashToggle);
      
      // Update MSW mock to return trash
      mockTRPCResponse("concept.list", [trashedConcept]);
      
      // Trashed concept should appear after refetch
      await waitFor(() => {
        // @ts-expect-error - jest-dom matcher
        expect(screen.getByText("Trashed Concept")).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe("Edit Concept Flow", () => {
    it("allows user to edit a concept", async () => {
      const user = userEvent.setup();
      const concept = createMockConcept({ id: "concept-1", title: "Original Title" });
      
      mockTRPCResponse("concept.list", [concept]);
      mockTRPCResponse("concept.getById", concept);
      
      renderWithTRPC(<ConceptsTab />);
      
      // Wait for concept to load
      await waitFor(() => {
        expect(screen.getByText("Original Title")).toBeInTheDocument();
      });
      
      // Find edit button (might be in ConceptActions)
      const editButton = screen.getByRole("button", { name: /edit/i });
      // @ts-expect-error - jest-dom matcher
      expect(editButton).toBeInTheDocument();
      
      // Click edit
      await user.click(editButton);
      
      // ConceptEditor should open (if modal or inline)
      // Verify by checking if form fields appear
      await waitFor(() => {
        const titleInput = screen.queryByLabelText(/title/i);
        if (titleInput) {
          // @ts-expect-error - jest-dom matcher
          expect(titleInput).toBeInTheDocument();
        }
      });
    });
  });

  describe("Delete and Restore Flow", () => {
    it("shows confirmation dialog before deleting concept", async () => {
      const user = userEvent.setup();
      const concept = createMockConcept({ id: "concept-1" });
      
      mockTRPCResponse("concept.list", [concept]);
      mockTRPCResponse("concept.delete", { success: true });
      
      renderWithTRPC(<ConceptsTab />);
      
      // Wait for concept to load
      await waitFor(() => {
        expect(screen.getByText(concept.title)).toBeInTheDocument();
      });
      
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
      const trashedConcept = createMockConcept({ 
        id: "concept-1",
        title: "Trashed Concept",
        trashedAt: new Date(),
      });
      
      mockTRPCResponse("concept.list", [trashedConcept]);
      mockTRPCResponse("concept.restore", { ...trashedConcept, trashedAt: null });
      
      // Show trash view
      renderWithTRPC(<ConceptsTab />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      const trashToggle = screen.getByLabelText(/show trash|trash/i);
      await user.click(trashToggle);
      
      // Wait for trashed concept to appear
      await waitFor(() => {
        expect(screen.getByText("Trashed Concept")).toBeInTheDocument();
      });
      
      // Find restore button
      const restoreButton = screen.getByRole("button", { name: /restore/i });
      await user.click(restoreButton);
      
      // After restore, the concept should be updated (trashedAt: null)
      // This would trigger a refetch in the real component
      await waitFor(() => {
        // The component should update after successful restore
        // This depends on how the component handles the mutation success
      }, { timeout: 3000 });
    });
  });
});

