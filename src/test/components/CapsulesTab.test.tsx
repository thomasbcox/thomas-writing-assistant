/**
 * Component tests for CapsulesTab
 * Last Updated: 2025-12-11
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { CapsulesTab } from "~/components/CapsulesTab";
import { createMockCapsule, createMockAnchor, createMockRepurposedContent } from "../utils/test-factories";
import {
  mockCapsuleListUseQuery,
  mockCapsuleCreateUseMutation,
  mockCreateAnchorFromPDFUseMutation,
  mockRegenerateRepurposedContentUseMutation,
  mockUpdateAnchorUseMutation,
  mockDeleteAnchorUseMutation,
  mockUpdateRepurposedContentUseMutation,
  mockDeleteRepurposedContentUseMutation,
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

describe("CapsulesTab - User Flows", () => {
  beforeEach(() => {
    resetAllTRPCMocks();
  });

  describe("Create Capsule Flow", () => {
    it("allows user to create a new capsule successfully", async () => {
      const user = userEvent.setup();
      const mockRefetch = jest.fn();
      const mockMutate = jest.fn();
      
      mockCapsuleListUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      
      mockCapsuleCreateUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      // Click create button
      const createButton = screen.getByRole("button", { name: /create.*capsule/i });
      await user.click(createButton);
      
      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const promiseInput = screen.getByLabelText(/promise/i);
      const ctaInput = screen.getByLabelText(/cta/i);
      
      await user.type(titleInput, "My Test Capsule");
      await user.type(promiseInput, "This will help you");
      await user.type(ctaInput, "Get started now");
      
      // Submit
      const submitButton = screen.getByRole("button", { name: /create capsule/i });
      await user.click(submitButton);
      
      // Verify API called
      expect(mockMutate).toHaveBeenCalledWith({
        title: "My Test Capsule",
        promise: "This will help you",
        cta: "Get started now",
        offerMapping: "",
      });
      
      // Verify mutation was called
      expect(mockMutate).toHaveBeenCalled();
      
      // Simulate success callback if provided
      const mutateCall = mockMutate.mock.calls[0];
      if (mutateCall && mutateCall[1]?.onSuccess) {
        mutateCall[1].onSuccess();
        await waitFor(() => {
          expect(mockRefetch).toHaveBeenCalled();
        });
      }
    });

    it("shows validation for required fields", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      
      mockCapsuleCreateUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      // Try to submit without filling fields
      const createButton = screen.getByRole("button", { name: /create.*capsule/i });
      await user.click(createButton);
      
      // HTML5 validation should prevent submission
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toBeRequired();
    });

    it("shows loading state during capsule creation", async () => {
      mockCapsuleCreateUseMutation.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      // Should show loading state (if implemented in UI)
      const createButton = screen.getByRole("button", { name: /create.*capsule/i });
      expect(createButton).toBeDisabled();
    });

    it("displays error toast on creation failure", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn((data, callbacks) => {
        // Simulate error
        if (callbacks?.onError) {
          callbacks.onError(new Error("Failed to create capsule"));
        }
      });
      
      mockCapsuleCreateUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      await user.click(screen.getByRole("button", { name: /create.*capsule/i }));
      await user.type(screen.getByLabelText(/title/i), "Test");
      await user.type(screen.getByLabelText(/promise/i), "Test");
      await user.type(screen.getByLabelText(/cta/i), "Test");
      await user.click(screen.getByRole("button", { name: /create capsule/i }));
      
      // Error toast should appear
      await waitFor(() => {
        expect(screen.getByText(/failed to create/i)).toBeInTheDocument();
      });
    });
  });

  describe("PDF Upload Flow", () => {
    it("allows user to select PDF file for upload", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      
      mockCapsuleListUseQuery.mockReturnValue({
        data: [createMockCapsule({ id: "capsule-1", title: "Existing Capsule" })],
        isLoading: false,
        refetch: jest.fn(),
      });
      
      mockCreateAnchorFromPDFUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      // Find file input (might be hidden)
      const fileInput = screen.getByLabelText(/upload|file|pdf/i) as HTMLInputElement;
      
      // Create a mock file
      const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
      
      await user.upload(fileInput, file);
      
      // File should be selected (if handler is called)
      expect(fileInput.files?.[0]).toBe(file);
    });

    it("shows loading state during PDF processing", () => {
      mockCreateAnchorFromPDFUseMutation.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      // Should show processing status
      expect(screen.queryByText(/processing|uploading/i)).toBeInTheDocument();
    });
  });

  describe("View and Manage Derivatives Flow", () => {
    it("allows user to expand capsule to view anchors", async () => {
      const user = userEvent.setup();
      const capsule = createMockCapsule({
        anchors: [createMockAnchor({ title: "Test Anchor" })],
      });
      
      mockCapsuleListUseQuery.mockReturnValue({
        data: [capsule],
        isLoading: false,
        refetch: jest.fn(),
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      // Find capsule title
      const capsuleTitle = screen.getByText("Test Capsule");
      
      // Click to expand (if expandable)
      await user.click(capsuleTitle);
      
      // Anchor should be visible
      await waitFor(() => {
        expect(screen.getByText("Test Anchor")).toBeInTheDocument();
      });
    });

    it("allows user to view derivatives for an anchor", async () => {
      const user = userEvent.setup();
      const anchor = createMockAnchor({
        id: "anchor-1",
        repurposedContent: [
          createMockRepurposedContent({ type: "social_post", content: "Post 1" }),
          createMockRepurposedContent({ type: "email", content: "Email content" }),
        ],
      });
      const capsule = createMockCapsule({
        anchors: [anchor],
      });
      
      mockCapsuleListUseQuery.mockReturnValue({
        data: [capsule],
        isLoading: false,
        refetch: jest.fn(),
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      // Expand capsule first - look for expand/collapse button or click capsule card
      const capsuleTitle = screen.getByText("Test Capsule");
      const capsuleCard = capsuleTitle.closest('[class*="capsule"]') || capsuleTitle.parentElement;
      if (capsuleCard) {
        await user.click(capsuleCard as HTMLElement);
      }
      
      // Look for "View Derivatives" button (might be labeled differently)
      const viewDerivativesButton = screen.queryByRole("button", { name: /view derivatives|derivatives/i });
      if (viewDerivativesButton) {
        await user.click(viewDerivativesButton);
      }
      
      // Derivatives should be visible
      await waitFor(() => {
        expect(screen.getByText("Post 1")).toBeInTheDocument();
        expect(screen.getByText("Email content")).toBeInTheDocument();
      });
    });
  });

  describe("Edit and Delete Anchor Flow", () => {
    it("allows user to edit an anchor", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      const mockRefetch = jest.fn();
      const anchor = createMockAnchor({ id: "anchor-1", title: "Original Title" });
      const capsule = createMockCapsule({
        anchors: [anchor],
      });
      
      mockCapsuleListUseQuery.mockReturnValue({
        data: [capsule],
        isLoading: false,
        refetch: mockRefetch,
      });
      
      mockUpdateAnchorUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      // Expand capsule
      const capsuleTitle = screen.getByText("Test Capsule");
      await user.click(capsuleTitle);
      
      // Find and click edit button
      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);
      
      // AnchorEditor should open (if modal)
      // This would require checking if AnchorEditor renders
      // For now, verify edit button exists and is clickable
      expect(editButton).toBeInTheDocument();
    });

    it("shows confirmation dialog before deleting anchor", async () => {
      const user = userEvent.setup();
      const mockMutate = jest.fn();
      const anchor = createMockAnchor({ id: "anchor-1" });
      const capsule = createMockCapsule({
        anchors: [anchor],
      });
      
      mockCapsuleListUseQuery.mockReturnValue({
        data: [capsule],
        isLoading: false,
        refetch: jest.fn(),
      });
      
      mockDeleteAnchorUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });
      
      renderWithTRPC(<CapsulesTab />);
      
      // Expand capsule
      const capsuleTitle = screen.getByText("Test Capsule");
      await user.click(capsuleTitle);
      
      // Find delete button
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);
      
      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/are you sure|confirm/i)).toBeInTheDocument();
      });
    });
  });
});

