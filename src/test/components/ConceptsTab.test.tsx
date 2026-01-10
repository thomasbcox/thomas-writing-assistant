/**
 * Tests for ConceptsTab component
 * Tests sorting, filtering, search, and link count display
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock data
const mockConcepts = [
  { id: "c1", title: "Alpha Concept", identifier: "concept-1", content: "Content 1", creator: "Creator A", source: "Source A", year: "2024", status: "active", createdAt: "2024-01-01", updatedAt: "2024-01-01", description: null, trashedAt: null },
  { id: "c2", title: "Beta Concept", identifier: "concept-2", content: "Content 2", creator: "Creator B", source: "Source B", year: "2025", status: "active", createdAt: "2025-01-01", updatedAt: "2025-01-01", description: null, trashedAt: null },
  { id: "c3", title: "Gamma Concept", identifier: "concept-3", content: "Content 3", creator: "Creator A", source: "Source A", year: "2023", status: "active", createdAt: "2023-01-01", updatedAt: "2023-01-01", description: null, trashedAt: null },
];

const mockLinkCounts = [
  { conceptId: "c1", count: 5 },
  { conceptId: "c2", count: 0 },
  { conceptId: "c3", count: 2 },
];

const mockUseUtils = jest.fn(() => ({
  concept: {
    list: { invalidate: jest.fn() },
  },
}));

jest.unstable_mockModule("../../hooks/useIPC", () => ({
  api: {
    concept: {
      list: {
        useQuery: () => ({
          data: mockConcepts,
          isLoading: false,
          error: null,
        }),
      },
      getById: {
        useQuery: () => ({
          data: null,
          isLoading: false,
          error: null,
        }),
      },
      create: {
        useMutation: () => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      delete: {
        useMutation: () => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      restore: {
        useMutation: () => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      purgeTrash: {
        useMutation: () => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
    },
    link: {
      getCountsByConcept: {
        useQuery: () => ({
          data: mockLinkCounts,
          isLoading: false,
          error: null,
        }),
      },
    },
    useUtils: mockUseUtils,
  },
  useUtils: mockUseUtils,
}));

jest.unstable_mockModule("../../components/ui/Toast", () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
  useToast: () => ({
    toasts: [],
    addToast: jest.fn(),
    removeToast: jest.fn(),
  }),
}));

jest.unstable_mockModule("../../components/ConceptList", () => ({
  ConceptList: ({ concepts, linkCounts }: any) => (
    <div data-testid="concept-list">
      {concepts?.map((c: any) => {
        const count = linkCounts?.get(c.id) ?? 0;
        return (
          <div key={c.id} data-testid={`concept-${c.id}`}>
            {c.title} ({count})
          </div>
        );
      })}
    </div>
  ),
}));

jest.unstable_mockModule("../../components/ConceptActions", () => ({
  ConceptActions: () => <div data-testid="concept-actions" />,
}));

jest.unstable_mockModule("../../components/ConceptCreateForm", () => ({
  ConceptCreateForm: () => <div data-testid="concept-create-form" />,
}));

jest.unstable_mockModule("../../components/ConceptEditor", () => ({
  ConceptEditor: () => <div data-testid="concept-editor" />,
}));

jest.unstable_mockModule("../../components/ConceptViewer", () => ({
  ConceptViewer: () => <div data-testid="concept-viewer" />,
}));

jest.unstable_mockModule("../../components/enrichment/ConceptEnrichmentStudio", () => ({
  ConceptEnrichmentStudio: () => <div data-testid="concept-enrichment-studio" />,
}));

jest.unstable_mockModule("../../components/ui/ConfirmDialog", () => ({
  ConfirmDialog: () => <div data-testid="confirm-dialog" />,
}));

jest.unstable_mockModule("../../components/ui/ContextualHelp", () => ({
  ContextualHelp: () => <div data-testid="contextual-help" />,
}));

// Import after mocking
const { ConceptsTab } = await import("../../components/ConceptsTab");

describe("ConceptsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render concepts tab", () => {
    render(<ConceptsTab />);
    expect(screen.getByText("Concepts")).toBeInTheDocument();
  });

  it("should display link counts in concept titles", () => {
    render(<ConceptsTab />);
    // ConceptList should show counts
    expect(screen.getByText(/Alpha Concept \(5\)/)).toBeInTheDocument();
    expect(screen.getByText(/Beta Concept \(0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Gamma Concept \(2\)/)).toBeInTheDocument();
  });

  it("should have sort controls", () => {
    render(<ConceptsTab />);
    expect(screen.getByText("Sort by:")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Date Created")).toBeInTheDocument();
  });

  it("should have filter toggle button", () => {
    render(<ConceptsTab />);
    expect(screen.getByText(/Show Filters/)).toBeInTheDocument();
  });

  it("should show filters when filter button is clicked", () => {
    render(<ConceptsTab />);
    const filterButton = screen.getByText(/Show Filters/);
    fireEvent.click(filterButton);
    expect(screen.getByText(/Hide Filters/)).toBeInTheDocument();
    // Use getAllByText since "Link Count" appears in both sort dropdown and filter label
    const linkCountElements = screen.getAllByText("Link Count");
    expect(linkCountElements.length).toBeGreaterThan(0);
  });

  it("should have search input", () => {
    render(<ConceptsTab />);
    const searchInput = screen.getByPlaceholderText(/Search concepts/);
    expect(searchInput).toBeInTheDocument();
  });

  it("should filter by zero links when checkbox is checked", () => {
    render(<ConceptsTab />);
    // Open filters
    fireEvent.click(screen.getByText(/Show Filters/));
    // Check zero links only
    const checkbox = screen.getByLabelText(/Show only concepts with zero links/i);
    fireEvent.click(checkbox);
    // Should only show Beta Concept (count 0)
    expect(screen.getByText(/Beta Concept \(0\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Alpha Concept/)).not.toBeInTheDocument();
  });
});
