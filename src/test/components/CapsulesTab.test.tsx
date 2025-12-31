/**
 * Tests for CapsulesTab component
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock data
const mockCapsules = [
  {
    id: "cap1",
    title: "Test Capsule 1",
    promise: "Test promise 1",
    cta: "Test CTA 1",
    offerMapping: "Offer 1",
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    anchors: [
      {
        id: "anch1",
        capsuleId: "cap1",
        title: "Test Anchor 1",
        content: "Anchor content",
        painPoints: null,
        solutionSteps: null,
        proof: null,
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
        repurposedContent: [],
      },
    ],
  },
  {
    id: "cap2",
    title: "Test Capsule 2",
    promise: "Test promise 2",
    cta: "Test CTA 2",
    offerMapping: null,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    anchors: [],
  },
];

const mockRefetch = jest.fn();

// Mock the hooks module
jest.unstable_mockModule("../../hooks/useIPC", () => ({
  api: {
    capsule: {
      list: {
        useQuery: () => ({
          data: mockCapsules,
          isLoading: false,
          error: null,
          refetch: mockRefetch,
        }),
      },
      create: {
        useMutation: (options?: any) => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      createAnchorFromPDF: {
        useMutation: (options?: any) => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      regenerateRepurposedContent: {
        useMutation: (options?: any) => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      updateAnchor: {
        useMutation: (options?: any) => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      deleteAnchor: {
        useMutation: (options?: any) => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      updateRepurposedContent: {
        useMutation: (options?: any) => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      deleteRepurposedContent: {
        useMutation: (options?: any) => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
    },
    pdf: {
      extractText: {
        useMutation: (options?: any) => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
    },
  },
}));

// Mock sub-components
jest.unstable_mockModule("../../components/ui/Toast", () => ({
  ToastContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="toast-container">{children}</div>,
  useToast: () => ({
    toasts: [],
    addToast: jest.fn(),
    removeToast: jest.fn(),
  }),
}));

jest.unstable_mockModule("../../components/AnchorEditor", () => ({
  AnchorEditor: () => <div data-testid="anchor-editor">Anchor Editor</div>,
}));

jest.unstable_mockModule("../../components/capsules/CapsuleInfoSection", () => ({
  CapsuleInfoSection: () => <div data-testid="capsule-info">Capsule Info Section</div>,
}));

jest.unstable_mockModule("../../components/capsules/PDFUploadSection", () => ({
  PDFUploadSection: ({ capsules, onSuccess, onError }: any) => (
    <div data-testid="pdf-upload-section">
      PDF Upload Section (Capsules: {capsules?.length || 0})
    </div>
  ),
}));

jest.unstable_mockModule("../../components/capsules/CreateCapsuleForm", () => ({
  CreateCapsuleForm: ({ onSuccess }: any) => (
    <div data-testid="create-capsule-form">
      <button onClick={onSuccess}>Create Capsule</button>
    </div>
  ),
}));

jest.unstable_mockModule("../../components/capsules/CapsuleList", () => ({
  CapsuleList: ({ capsules, onToggleExpand, expandedCapsules }: any) => (
    <div data-testid="capsule-list">
      Capsule List ({capsules?.length || 0} capsules)
      {capsules?.map((c: any) => (
        <div key={c.id} data-testid={`capsule-${c.id}`}>
          <span>{c.title}</span>
          <button onClick={() => onToggleExpand(c.id)}>Toggle</button>
        </div>
      ))}
    </div>
  ),
}));

// Import after mocking
const { CapsulesTab } = await import("../../components/CapsulesTab");

describe("CapsulesTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render clear button", () => {
    render(<CapsulesTab />);
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("should render capsule info section", () => {
    render(<CapsulesTab />);
    expect(screen.getByTestId("capsule-info")).toBeInTheDocument();
  });

  it("should render PDF upload section", () => {
    render(<CapsulesTab />);
    expect(screen.getByTestId("pdf-upload-section")).toBeInTheDocument();
  });

  it("should render create capsule form", () => {
    render(<CapsulesTab />);
    expect(screen.getByTestId("create-capsule-form")).toBeInTheDocument();
  });

  it("should render capsule list", () => {
    render(<CapsulesTab />);
    expect(screen.getByTestId("capsule-list")).toBeInTheDocument();
  });

  it("should pass capsules count to PDF upload section", () => {
    render(<CapsulesTab />);
    expect(screen.getByText(/Capsules: 2/)).toBeInTheDocument();
  });

  it("should pass capsules count to capsule list", () => {
    render(<CapsulesTab />);
    expect(screen.getByText(/2 capsules/)).toBeInTheDocument();
  });

  it("should render capsule titles in list", () => {
    render(<CapsulesTab />);
    expect(screen.getByText("Test Capsule 1")).toBeInTheDocument();
    expect(screen.getByText("Test Capsule 2")).toBeInTheDocument();
  });

  it("should call refetch when clear button is clicked", () => {
    render(<CapsulesTab />);
    const clearButton = screen.getByText("Clear");
    fireEvent.click(clearButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("should render toast container", () => {
    render(<CapsulesTab />);
    expect(screen.getByTestId("toast-container")).toBeInTheDocument();
  });
});

