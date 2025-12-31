/**
 * Tests for LinkList component
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock data
const mockConcepts = [
  { 
    id: "c1", 
    title: "Concept 1", 
    identifier: "concept-1", 
    content: "Content 1", 
    creator: "Creator", 
    source: "Source", 
    year: "2025", 
    status: "active", 
    createdAt: "2025-01-01", 
    updatedAt: "2025-01-01", 
    description: null, 
    trashedAt: null 
  },
  { 
    id: "c2", 
    title: "Concept 2", 
    identifier: "concept-2", 
    content: "Content 2", 
    creator: "Creator", 
    source: "Source", 
    year: "2025", 
    status: "active", 
    createdAt: "2025-01-01", 
    updatedAt: "2025-01-01", 
    description: null, 
    trashedAt: null 
  },
];

const mockLinkName = { 
  id: "ln1", 
  forwardName: "relates to", 
  reverseName: "is related to", 
  isSymmetric: false, 
  isDefault: false, 
  isDeleted: false, 
  createdAt: "2025-01-01" 
};

const mockLinks = [
  { 
    id: "l1", 
    sourceId: "c1", 
    targetId: "c2", 
    linkNameId: "ln1", 
    notes: null,
    createdAt: "2025-01-01", 
    source: mockConcepts[0], 
    target: mockConcepts[1], 
    linkName: mockLinkName
  },
];

const mockConceptLinks = {
  outgoing: [
    { 
      id: "l1", 
      sourceId: "c1", 
      targetId: "c2", 
      linkNameId: "ln1", 
      notes: null,
      createdAt: "2025-01-01", 
      source: mockConcepts[0], 
      target: mockConcepts[1], 
      linkName: mockLinkName
    },
  ],
  incoming: [
    { 
      id: "l2", 
      sourceId: "c2", 
      targetId: "c1", 
      linkNameId: "ln1", 
      notes: null,
      createdAt: "2025-01-01", 
      source: mockConcepts[1], 
      target: mockConcepts[0], 
      linkName: mockLinkName
    },
  ],
};

// Import after mocking
const { LinkList } = await import("../../components/LinkList");

describe("LinkList", () => {
  const mockOnDeleteLink = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("All Links View", () => {
    it("should render all links header", () => {
      render(
        <LinkList
          allLinks={mockLinks}
          concepts={mockConcepts}
          onDeleteLink={mockOnDeleteLink}
        />
      );
      expect(screen.getByText("All Links")).toBeInTheDocument();
    });

    it("should render link items with source and target", () => {
      render(
        <LinkList
          allLinks={mockLinks}
          concepts={mockConcepts}
          onDeleteLink={mockOnDeleteLink}
        />
      );
      // Should show both concept titles and link name
      expect(screen.getByText("Concept 1")).toBeInTheDocument();
      expect(screen.getByText("Concept 2")).toBeInTheDocument();
      expect(screen.getByText('"relates to"')).toBeInTheDocument();
    });

    it("should call onDeleteLink when delete button is clicked", () => {
      render(
        <LinkList
          allLinks={mockLinks}
          concepts={mockConcepts}
          onDeleteLink={mockOnDeleteLink}
        />
      );
      
      const deleteButton = screen.getByText("Delete");
      fireEvent.click(deleteButton);
      
      expect(mockOnDeleteLink).toHaveBeenCalledWith("c1", "c2");
    });

    it("should show loading message when isLoading is true", () => {
      render(
        <LinkList
          allLinks={[]}
          concepts={mockConcepts}
          isLoading={true}
          onDeleteLink={mockOnDeleteLink}
        />
      );
      expect(screen.getByText("Loading links...")).toBeInTheDocument();
    });

    it("should show error message when error exists", () => {
      render(
        <LinkList
          allLinks={[]}
          concepts={mockConcepts}
          error={new Error("Failed to load")}
          onDeleteLink={mockOnDeleteLink}
        />
      );
      expect(screen.getByText(/Error: Failed to load/)).toBeInTheDocument();
    });

    it("should show empty state when no links exist", () => {
      render(
        <LinkList
          allLinks={[]}
          concepts={mockConcepts}
          onDeleteLink={mockOnDeleteLink}
        />
      );
      expect(screen.getByText(/No links yet/)).toBeInTheDocument();
    });
  });

  describe("Concept Links View", () => {
    it("should render concept-specific links header", () => {
      render(
        <LinkList
          conceptLinks={mockConceptLinks}
          concepts={mockConcepts}
          selectedConceptTitle="Concept 1"
          onDeleteLink={mockOnDeleteLink}
        />
      );
      expect(screen.getByText("Links for: Concept 1")).toBeInTheDocument();
    });

    it("should show outgoing links section", () => {
      render(
        <LinkList
          conceptLinks={mockConceptLinks}
          concepts={mockConcepts}
          selectedConceptTitle="Concept 1"
          onDeleteLink={mockOnDeleteLink}
        />
      );
      expect(screen.getByText("OUTGOING:")).toBeInTheDocument();
    });

    it("should show incoming links section", () => {
      render(
        <LinkList
          conceptLinks={mockConceptLinks}
          concepts={mockConcepts}
          selectedConceptTitle="Concept 1"
          onDeleteLink={mockOnDeleteLink}
        />
      );
      expect(screen.getByText("INCOMING:")).toBeInTheDocument();
    });

    it("should show empty message when no concept links exist", () => {
      render(
        <LinkList
          conceptLinks={{ outgoing: [], incoming: [] }}
          concepts={mockConcepts}
          selectedConceptTitle="Concept 1"
          onDeleteLink={mockOnDeleteLink}
        />
      );
      expect(screen.getByText("No links for this concept yet.")).toBeInTheDocument();
    });
  });
});

