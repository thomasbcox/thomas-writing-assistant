/**
 * Tests for ManualLinkForm component
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

const mockLinkNamePairs = [
  { id: "ln1", forwardName: "relates to", reverseName: "is related to", isSymmetric: false },
  { id: "ln2", forwardName: "references", reverseName: "is referenced by", isSymmetric: false },
];

const mockMutate = jest.fn();

// Mock the hooks module
jest.unstable_mockModule("../../hooks/useIPC", () => ({
  api: {
    link: {
      create: {
        useMutation: (options?: any) => ({
          mutate: (input: any) => {
            mockMutate(input);
            if (options?.onSuccess) {
              options.onSuccess({});
            }
          },
          isLoading: false,
        }),
      },
    },
  },
}));

// Mock SearchableSelect
jest.unstable_mockModule("../../components/ui/SearchableSelect", () => ({
  SearchableSelect: ({ onChange, placeholder, label, value }: { onChange: (value: string) => void; placeholder: string; label?: string; value?: string }) => (
    <div>
      {label && <label>{label}</label>}
      <select 
        data-testid={`select-${label?.toLowerCase().replace(/\s+/g, '-')}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        <option value="c1">Concept 1</option>
        <option value="c2">Concept 2</option>
      </select>
    </div>
  ),
}));

// Import after mocking
const { ManualLinkForm } = await import("../../components/ManualLinkForm");

describe("ManualLinkForm", () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render source concept selector", () => {
    render(
      <ManualLinkForm
        concepts={mockConcepts}
        linkNamePairs={mockLinkNamePairs}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Source Concept")).toBeInTheDocument();
  });

  it("should render target concept selector", () => {
    render(
      <ManualLinkForm
        concepts={mockConcepts}
        linkNamePairs={mockLinkNamePairs}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Target Concept")).toBeInTheDocument();
  });

  it("should render link name pair selector", () => {
    render(
      <ManualLinkForm
        concepts={mockConcepts}
        linkNamePairs={mockLinkNamePairs}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Link Name Pair (required)")).toBeInTheDocument();
  });

  it("should render notes textarea", () => {
    render(
      <ManualLinkForm
        concepts={mockConcepts}
        linkNamePairs={mockLinkNamePairs}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Notes (optional)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Additional notes/)).toBeInTheDocument();
  });

  it("should render create and cancel buttons", () => {
    render(
      <ManualLinkForm
        concepts={mockConcepts}
        linkNamePairs={mockLinkNamePairs}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText("Create Link")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("should call onCancel when cancel button is clicked", () => {
    render(
      <ManualLinkForm
        concepts={mockConcepts}
        linkNamePairs={mockLinkNamePairs}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    );
    
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("should call onError when create is clicked without required fields", () => {
    render(
      <ManualLinkForm
        concepts={mockConcepts}
        linkNamePairs={mockLinkNamePairs}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    );
    
    const createButton = screen.getByText("Create Link");
    fireEvent.click(createButton);
    
    expect(mockOnError).toHaveBeenCalledWith("Please fill in source, target, and link name pair");
  });

  it("should render link name options from props", () => {
    render(
      <ManualLinkForm
        concepts={mockConcepts}
        linkNamePairs={mockLinkNamePairs}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    );
    
    // Check that options are rendered (multiple comboboxes exist due to SearchableSelect mocks)
    expect(screen.getByText(/relates to.*is related to/)).toBeInTheDocument();
    expect(screen.getByText(/references.*is referenced by/)).toBeInTheDocument();
  });

  it("should show message when no link name pairs available", () => {
    render(
      <ManualLinkForm
        concepts={mockConcepts}
        linkNamePairs={[]}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText("No link name pairs available")).toBeInTheDocument();
  });
});

