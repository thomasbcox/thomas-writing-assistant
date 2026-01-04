/**
 * Tests for LinksTab component
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock data
const mockConcepts = [
  { id: "c1", title: "Concept 1", identifier: "concept-1", content: "Content 1", creator: "Creator", source: "Source", year: "2025", status: "active", createdAt: "2025-01-01", updatedAt: "2025-01-01", description: null, trashedAt: null },
  { id: "c2", title: "Concept 2", identifier: "concept-2", content: "Content 2", creator: "Creator", source: "Source", year: "2025", status: "active", createdAt: "2025-01-01", updatedAt: "2025-01-01", description: null, trashedAt: null },
];

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
    linkName: { id: "ln1", forwardName: "relates to", reverseName: "is related to", isSymmetric: false, isDefault: false, isDeleted: false, createdAt: "2025-01-01" }
  },
];

const mockLinkNames = [
  { id: "ln1", forwardName: "relates to", reverseName: "is related to", isSymmetric: false, isDefault: false, isDeleted: false, createdAt: "2025-01-01" },
  { id: "ln2", forwardName: "references", reverseName: "is referenced by", isSymmetric: false, isDefault: false, isDeleted: false, createdAt: "2025-01-01" },
];

const mockDeleteMutate = jest.fn();
const mockCreateMutate = jest.fn();

// Mock the hooks module
const mockUseUtils = jest.fn(() => ({
  link: {
    getByConcept: { invalidate: jest.fn() },
    getAll: { invalidate: jest.fn() },
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
    },
    link: {
      getAll: {
        useQuery: () => ({
          data: mockLinks,
          isLoading: false,
          error: null,
        }),
      },
      getByConcept: {
        useQuery: () => ({
          data: { outgoing: mockLinks, incoming: [] },
          isLoading: false,
          error: null,
        }),
      },
      delete: {
        useMutation: (options?: any) => ({
          mutate: mockDeleteMutate,
          isLoading: false,
        }),
      },
      create: {
        useMutation: (options?: any) => ({
          mutate: mockCreateMutate,
          isLoading: false,
        }),
      },
      update: {
        useMutation: (options?: any) => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
    },
    linkName: {
      getAll: {
        useQuery: () => ({
          data: mockLinkNames,
          isLoading: false,
          error: null,
        }),
      },
    },
    useUtils: mockUseUtils,
  },
  useUtils: mockUseUtils,
}));

// Mock Toast
jest.unstable_mockModule("../../components/ui/Toast", () => ({
  ToastContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="toast-container">{children}</div>,
  useToast: () => ({
    toasts: [],
    addToast: jest.fn(),
    removeToast: jest.fn(),
  }),
}));

// Mock sub-components
jest.unstable_mockModule("../../components/LinkProposer", () => ({
  LinkProposer: () => <div data-testid="link-proposer">Link Proposer</div>,
}));

jest.unstable_mockModule("../../components/LinkNameManager", () => ({
  LinkNameManager: () => <div data-testid="link-name-manager">Link Name Manager</div>,
}));

jest.unstable_mockModule("../../components/ui/SearchableSelect", () => ({
  SearchableSelect: ({ onChange, placeholder, label }: { onChange: (value: string) => void; placeholder: string; label?: string }) => (
    <div>
      {label && <label>{label}</label>}
      <select data-testid="searchable-select" onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        <option value="c1">Concept 1</option>
        <option value="c2">Concept 2</option>
      </select>
    </div>
  ),
}));

// Import after mocking
const { LinksTab } = await import("../../components/LinksTab");

describe("LinksTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render links tab header", () => {
    render(<LinksTab />);
    expect(screen.getByText("Links")).toBeInTheDocument();
  });

  it("should render link name manager toggle", () => {
    render(<LinksTab />);
    // The button says "Show Link Name Manager" or "Hide Link Name Manager"
    expect(screen.getByText(/Link Name Manager/)).toBeInTheDocument();
  });

  it("should render all links section", () => {
    render(<LinksTab />);
    expect(screen.getByText("All Links")).toBeInTheDocument();
  });

  it("should show clear button", () => {
    render(<LinksTab />);
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("should toggle link name manager visibility", () => {
    render(<LinksTab />);
    
    // Initially not visible
    expect(screen.queryByTestId("link-name-manager")).not.toBeInTheDocument();
    
    // Click to show
    const manageButton = screen.getByText(/Show Link Name Manager/);
    fireEvent.click(manageButton);
    
    expect(screen.getByTestId("link-name-manager")).toBeInTheDocument();
  });

  it("should render create manual link section", () => {
    render(<LinksTab />);
    expect(screen.getByText("Create Manual Link")).toBeInTheDocument();
  });

  it("should have create link button", () => {
    render(<LinksTab />);
    expect(screen.getByText("Create Link")).toBeInTheDocument();
  });
});
