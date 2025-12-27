import { describe, it, expect, beforeEach } from "@jest/globals";
import { jest } from "@jest/globals";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { TextInputTab } from "~/components/TextInputTab";
import { renderWithTRPC, mockTRPCMutation } from "../utils/trpc-test-utils";

// Import the utility to ensure the mock is set up
import "../utils/trpc-test-utils";

describe("TextInputTab - User Flows", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await mockTRPCMutation("concept", "generateCandidates", {
      mutateAsync: jest.fn(() => Promise.resolve([])),
    });
    await mockTRPCMutation("pdf", "extractText", {
      mutateAsync: jest.fn(() => Promise.resolve({ text: "extracted text" })),
    });
  });

  describe("Generate Concepts from Text Flow", () => {
    it("allows user to paste text and generate concepts", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn((...args: unknown[]) => 
        Promise.resolve([
          { title: "Concept 1", content: "Content 1", summary: "Summary 1" },
        ])
      );
      
      mockGenerateCandidatesUseMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      
      renderWithTRPC(<TextInputTab />);
      
      // Find text input
      const textInput = screen.getByLabelText(/paste text|or paste/i);
      
      // Paste text
      await user.type(textInput, "This is test content for concept extraction.");
      
      // Click generate button
      const generateButton = screen.getByRole("button", { name: /generate concepts/i });
      await user.click(generateButton);
      
      // API should be called
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          text: "This is test content for concept extraction.",
          instructions: undefined,
          maxCandidates: 5,
          defaultCreator: undefined,
          defaultYear: undefined,
        });
      });
    });

    it("shows loading state during generation", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn(() => 
        new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );
      
      mockGenerateCandidatesUseMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false, // Will be true during async operation
      });
      
      renderWithTRPC(<TextInputTab />);
      
      // Enter text
      const textInput = screen.getByLabelText(/paste text|or paste/i);
      await user.type(textInput, "Test content");
      
      // Start generation
      const generateButton = screen.getByRole("button", { name: /generate concepts/i });
      await user.click(generateButton);
      
      // Should show loading state (ConceptGenerationStatus component)
      // The button should show "Generating..." or be disabled
      // @ts-expect-error - jest-dom matcher
        expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it("shows error toast on generation failure", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn(() => 
        Promise.reject(new Error("Generation failed"))
      );
      
      mockGenerateCandidatesUseMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      
      renderWithTRPC(<TextInputTab />);
      
      // Enter text
      const textInput = screen.getByLabelText(/paste text|or paste/i);
      await user.type(textInput, "Test content");
      
      // Try to generate
      const generateButton = screen.getByRole("button", { name: /generate concepts/i });
      await user.click(generateButton);
      
      // Error toast should appear
      await waitFor(() => {
        // @ts-expect-error - jest-dom matcher
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it("disables generate button when text is empty", () => {
      mockGenerateCandidatesUseMutation.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      
      renderWithTRPC(<TextInputTab />);
      
      // Generate button should be disabled
      const generateButton = screen.getByRole("button", { name: /generate concepts/i });
      // @ts-expect-error - jest-dom matcher
      expect(generateButton).toBeDisabled();
    });

    it("displays generated candidates after successful generation", async () => {
      const user = userEvent.setup();
      const candidates = [
        { title: "Concept 1", content: "Content 1", summary: "Summary 1" },
        { title: "Concept 2", content: "Content 2", summary: "Summary 2" },
      ];
      
      const mockMutateAsync = jest.fn((...args: unknown[]) => Promise.resolve(candidates));
      
      mockGenerateCandidatesUseMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      
      renderWithTRPC(<TextInputTab />);
      
      // Enter text and generate
      const textInput = screen.getByLabelText(/paste text|or paste/i);
      await user.type(textInput, "Test content");
      
      const generateButton = screen.getByRole("button", { name: /generate concepts/i });
      await user.click(generateButton);
      
      // Candidates should appear
      await waitFor(() => {
        // @ts-expect-error - jest-dom matcher
        expect(screen.getByText("Concept 1")).toBeInTheDocument();
        // @ts-expect-error - jest-dom matcher
        expect(screen.getByText("Concept 2")).toBeInTheDocument();
      });
    });
  });

  describe("PDF Upload Flow", () => {
    it("allows user to upload PDF file", async () => {
      const user = userEvent.setup();
      const mockExtractAsync = jest.fn(() => 
        Promise.resolve({ text: "Extracted PDF text" })
      );
      
      mockExtractTextUseMutation.mockReturnValue({
        mutateAsync: mockExtractAsync,
        isPending: false,
      });
      
      renderWithTRPC(<TextInputTab />);
      
      // Find file input
      const fileInput = screen.getByLabelText(/upload|file|pdf/i) as HTMLInputElement;
      
      // Create mock PDF file
      const file = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
      
      // Upload file
      await user.upload(fileInput, file);
      
      // Text extraction should be called
      await waitFor(() => {
        expect(mockExtractAsync).toHaveBeenCalled();
      });
    });

    it("shows error for invalid PDF", async () => {
      const user = userEvent.setup();
      const mockExtractAsync = jest.fn(() => 
        Promise.reject(new Error("Invalid PDF format"))
      );
      
      mockExtractTextUseMutation.mockReturnValue({
        mutateAsync: mockExtractAsync,
        isPending: false,
      });
      
      renderWithTRPC(<TextInputTab />);
      
      // Upload invalid file
      const fileInput = screen.getByLabelText(/upload|file|pdf/i) as HTMLInputElement;
      const file = new File(["not a pdf"], "test.txt", { type: "text/plain" });
      
      await user.upload(fileInput, file);
      
      // Error should be shown
      await waitFor(() => {
        // @ts-expect-error - jest-dom matcher
        expect(screen.getByText(/error|invalid/i)).toBeInTheDocument();
      });
    });
  });

  describe("Configuration Options", () => {
    it("allows user to set max candidates", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn((...args: unknown[]) => Promise.resolve([]));
      
      mockGenerateCandidatesUseMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      
      renderWithTRPC(<TextInputTab />);
      
      // Find max candidates input
      const maxCandidatesInput = screen.getByLabelText(/max candidates|maximum/i);
      
      // Change value
      await user.clear(maxCandidatesInput);
      await user.type(maxCandidatesInput, "10");
      
      // Enter text and generate
      const textInput = screen.getByLabelText(/paste text|or paste/i);
      await user.type(textInput, "Test");
      
      const generateButton = screen.getByRole("button", { name: /generate concepts/i });
      await user.click(generateButton);
      
      // Should use new max candidates value
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ maxCandidates: 10 })
        );
      });
    });

    it("allows user to add instructions", async () => {
      const user = userEvent.setup();
      const mockMutateAsync = jest.fn((...args: unknown[]) => Promise.resolve([]));
      
      mockGenerateCandidatesUseMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
      
      renderWithTRPC(<TextInputTab />);
      
      // Find instructions input
      const instructionsInput = screen.getByLabelText(/instructions/i);
      
      // Add instructions
      await user.type(instructionsInput, "Focus on technical concepts");
      
      // Enter text and generate
      const textInput = screen.getByLabelText(/paste text|or paste/i);
      await user.type(textInput, "Test");
      
      const generateButton = screen.getByRole("button", { name: /generate concepts/i });
      await user.click(generateButton);
      
      // Instructions should be included
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ instructions: "Focus on technical concepts" })
        );
      });
    });
  });
});

