/**
 * Tests for ConceptCandidateList component
 * Tests duplicate detection UI display
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConceptCandidateList } from "../../components/ConceptCandidateList";

// Mock the hooks module
const mockUseUtils = jest.fn(() => ({
  concept: {
    list: { invalidate: jest.fn() },
  },
}));

const mockCreateMutation = {
  mutate: jest.fn(),
  isLoading: false,
  isError: false,
  error: null,
};

jest.unstable_mockModule("../../hooks/useIPC", () => ({
  api: {
    useUtils: mockUseUtils,
    concept: {
      create: {
        useMutation: jest.fn(() => mockCreateMutation),
      },
    },
  },
}));

jest.unstable_mockModule("../../components/ui/Toast", () => ({
  ToastContainer: () => null,
  useToast: () => ({
    toasts: [],
    addToast: jest.fn(),
    removeToast: jest.fn(),
  }),
}));

jest.unstable_mockModule("../../components/ui/LoadingSpinner", () => ({
  LoadingSpinner: () => null,
}));

describe("ConceptCandidateList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render candidates without duplicates normally", async () => {
    const candidates = [
      {
        title: "Test Concept",
        content: "Test content",
        summary: "Test summary",
      },
    ];

    render(<ConceptCandidateList candidates={candidates} />);

    expect(screen.getByText("Test Concept")).toBeInTheDocument();
    expect(screen.getByText("Use This")).toBeInTheDocument();
    expect(screen.queryByText("Potential Duplicate")).not.toBeInTheDocument();
  });

  it("should display duplicate indicator for duplicate candidates", async () => {
    const candidates = [
      {
        title: "Duplicate Concept",
        content: "Test content",
        summary: "Test summary",
        isDuplicate: true,
        existingConceptId: "existing-123",
        similarity: 0.87,
      },
    ];

    render(<ConceptCandidateList candidates={candidates} />);

    expect(screen.getByText("Duplicate Concept")).toBeInTheDocument();
    expect(screen.getByText("Potential Duplicate")).toBeInTheDocument();
    expect(screen.getByText(/87% match with existing concept/)).toBeInTheDocument();
    expect(screen.getByText("Save Anyway")).toBeInTheDocument();
    expect(screen.getByText("View Existing")).toBeInTheDocument();
  });

  it("should show similarity score when available", async () => {
    const candidates = [
      {
        title: "Similar Concept",
        content: "Test content",
        summary: "Test summary",
        isDuplicate: true,
        similarity: 0.92,
      },
    ];

    render(<ConceptCandidateList candidates={candidates} />);

    expect(screen.getByText(/92% match with existing concept/)).toBeInTheDocument();
  });

  it("should show existing concept ID when available", async () => {
    const candidates = [
      {
        title: "Duplicate Concept",
        content: "Test content",
        summary: "Test summary",
        isDuplicate: true,
        existingConceptId: "concept-abc-123",
        similarity: 0.85,
      },
    ];

    render(<ConceptCandidateList candidates={candidates} />);

    expect(screen.getByText(/concept-abc-123/)).toBeInTheDocument();
  });

  it("should apply yellow styling to duplicate candidates", async () => {
    const candidates = [
      {
        title: "Duplicate Concept",
        content: "Test content",
        summary: "Test summary",
        isDuplicate: true,
        similarity: 0.88,
      },
    ];

    const { container } = render(<ConceptCandidateList candidates={candidates} />);
    
    // Check for yellow border/background classes
    const candidateDiv = container.querySelector(".border-yellow-400");
    expect(candidateDiv).toBeInTheDocument();
  });
});

