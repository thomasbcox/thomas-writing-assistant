/**
 * Tests for ConceptCandidateList component
 * Last Updated: 2025-12-11
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConceptCandidateList } from "~/components/ConceptCandidateList";
import { TestWrapper } from "../utils/test-wrapper";

// Mock tRPC
jest.mock("~/lib/trpc/react", () => ({
  api: {
    concept: {
      create: {
        useMutation: jest.fn(() => ({
          mutate: jest.fn(),
          mutateAsync: jest.fn(),
          isPending: false,
        })),
      },
    },
    useUtils: jest.fn(() => ({
      concept: {
        list: {
          invalidate: jest.fn(),
        },
      },
    })),
  },
}));

describe("ConceptCandidateList", () => {
  const mockCandidates = [
    {
      title: "Test Concept 1",
      coreDefinition: "This is a test concept definition",
      managerialApplication: "Use this to test concepts",
      content: "Full content for test concept 1",
      description: "This is a test concept definition",
      summary: "This is a test concept definition",
    },
    {
      title: "Test Concept 2",
      coreDefinition: "Another test concept",
      managerialApplication: "Another application",
      content: "Full content for test concept 2",
    },
  ];

  it("should render candidates list", () => {
    render(
      <TestWrapper>
        <ConceptCandidateList candidates={mockCandidates} />
      </TestWrapper>,
    );

    expect(screen.getByText("Generated Concept Candidates (2)")).toBeInTheDocument();
    expect(screen.getByText("Test Concept 1")).toBeInTheDocument();
    expect(screen.getByText("Test Concept 2")).toBeInTheDocument();
  });

  it("should display core definition and managerial application", () => {
    render(
      <TestWrapper>
        <ConceptCandidateList candidates={mockCandidates} />
      </TestWrapper>,
    );

    expect(screen.getByText("This is a test concept definition")).toBeInTheDocument();
    expect(screen.getByText("Use this to test concepts")).toBeInTheDocument();
  });

  it("should show 'Use This' button for each candidate", () => {
    render(
      <TestWrapper>
        <ConceptCandidateList candidates={mockCandidates} />
      </TestWrapper>,
    );

    const useButtons = screen.getAllByText("Use This");
    expect(useButtons).toHaveLength(2);
  });

  it("should show 'View Full' button for each candidate", () => {
    render(
      <TestWrapper>
        <ConceptCandidateList candidates={mockCandidates} />
      </TestWrapper>,
    );

    const viewButtons = screen.getAllByText("View Full");
    expect(viewButtons).toHaveLength(2);
  });

  it("should open edit form when 'Use This' is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <ConceptCandidateList candidates={mockCandidates} />
      </TestWrapper>,
    );

    const useButton = screen.getAllByText("Use This")[0];
    await user.click(useButton);

    // Should show edit form fields
    expect(screen.getByDisplayValue("Test Concept 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("This is a test concept definition")).toBeInTheDocument();
  });

  it("should show modal when 'View Full' is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <ConceptCandidateList candidates={mockCandidates} />
      </TestWrapper>,
    );

    const viewButton = screen.getAllByText("View Full")[0];
    await user.click(viewButton);

    // Should show modal with full content (check for content in pre tag specifically)
    expect(screen.getByText("Full content for test concept 1")).toBeInTheDocument();
    // Check that modal structure exists
    const modal = document.querySelector('.fixed.inset-0');
    expect(modal).toBeInTheDocument();
  });

  it("should close modal when close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <ConceptCandidateList candidates={mockCandidates} />
      </TestWrapper>,
    );

    const viewButton = screen.getAllByText("View Full")[0];
    await user.click(viewButton);

    // Modal should be visible (check for modal-specific content)
    expect(screen.getByText("Full content for test concept 1")).toBeInTheDocument();

    // Close modal - find close button within modal
    const modal = document.querySelector('.fixed.inset-0');
    expect(modal).toBeInTheDocument();
    const closeButton = modal?.querySelector('button');
    expect(closeButton).toBeInTheDocument();
    if (closeButton) {
      await user.click(closeButton);
    }

    // Modal should be closed
    await waitFor(() => {
      const closedModal = document.querySelector('.fixed.inset-0');
      expect(closedModal).not.toBeInTheDocument();
    });
  });

  it("should handle empty candidates list", () => {
    render(
      <TestWrapper>
        <ConceptCandidateList candidates={[]} />
      </TestWrapper>,
    );

    expect(screen.getByText("Generated Concept Candidates (0)")).toBeInTheDocument();
  });

  it("should use default creator and year when provided", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <ConceptCandidateList
          candidates={mockCandidates}
          defaultCreator="Test Creator"
          defaultYear="2025"
        />
      </TestWrapper>,
    );

    const useButton = screen.getAllByText("Use This")[0];
    await user.click(useButton);

    // Should show default creator and year in form
    expect(screen.getByDisplayValue("Test Creator")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2025")).toBeInTheDocument();
  });
});

