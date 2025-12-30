/**
 * Tests for ConfigTab component
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock config data
const mockStyleGuideRaw = { content: "voice: professional\ntone: friendly" };
const mockCredoRaw = { content: "values:\n  - quality\n  - clarity" };
const mockConstraintsRaw = { content: "rules:\n  - no jargon" };

const mockUpdateStyleGuide = jest.fn();
const mockUpdateCredo = jest.fn();
const mockUpdateConstraints = jest.fn();

// Mock the hooks module
jest.unstable_mockModule("../../hooks/useIPC", () => ({
  api: {
    config: {
      getStyleGuideRaw: {
        useQuery: () => ({
          data: mockStyleGuideRaw,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        }),
      },
      getCredoRaw: {
        useQuery: () => ({
          data: mockCredoRaw,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        }),
      },
      getConstraintsRaw: {
        useQuery: () => ({
          data: mockConstraintsRaw,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        }),
      },
      updateStyleGuide: {
        useMutation: (options?: any) => ({
          mutate: (data: any) => {
            mockUpdateStyleGuide(data);
            options?.onSuccess?.();
          },
          isLoading: false,
        }),
      },
      updateCredo: {
        useMutation: (options?: any) => ({
          mutate: (data: any) => {
            mockUpdateCredo(data);
            options?.onSuccess?.();
          },
          isLoading: false,
        }),
      },
      updateConstraints: {
        useMutation: (options?: any) => ({
          mutate: (data: any) => {
            mockUpdateConstraints(data);
            options?.onSuccess?.();
          },
          isLoading: false,
        }),
      },
    },
  },
}));

// Mock Toast - the component uses its own local toast state, not useToast hook
jest.unstable_mockModule("../../components/ui/Toast", () => ({
  ToastContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="toast-container">{children}</div>,
  useToast: () => ({
    toasts: [],
    addToast: jest.fn(),
    removeToast: jest.fn(),
  }),
}));

// Import after mocking
const { ConfigTab } = await import("../../components/ConfigTab");

describe("ConfigTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render config tab header", () => {
    render(<ConfigTab />);
    expect(screen.getByText("Writing Configuration")).toBeInTheDocument();
  });

  it("should render section tabs", () => {
    render(<ConfigTab />);
    expect(screen.getByText("Style Guide")).toBeInTheDocument();
    expect(screen.getByText("Credo & Values")).toBeInTheDocument();
    expect(screen.getByText("Constraints")).toBeInTheDocument();
  });

  it("should show Style Guide section by default", () => {
    render(<ConfigTab />);
    // The style guide tab should be active (blue background)
    const styleGuideTab = screen.getByText("Style Guide");
    expect(styleGuideTab).toHaveClass("bg-blue-600");
  });

  it("should switch to Credo section when clicked", () => {
    render(<ConfigTab />);
    
    const credoTab = screen.getByText("Credo & Values");
    fireEvent.click(credoTab);
    
    expect(credoTab).toHaveClass("bg-blue-600");
  });

  it("should switch to Constraints section when clicked", () => {
    render(<ConfigTab />);
    
    const constraintsTab = screen.getByText("Constraints");
    fireEvent.click(constraintsTab);
    
    expect(constraintsTab).toHaveClass("bg-blue-600");
  });

  it("should render style guide editor when style tab is active", () => {
    render(<ConfigTab />);
    // The style guide editor should show with textarea containing the content
    expect(screen.getByDisplayValue(/voice: professional/)).toBeInTheDocument();
  });
});

describe("ConfigTab - Style Guide Editor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display style guide content", () => {
    render(<ConfigTab />);
    expect(screen.getByDisplayValue(/voice: professional/)).toBeInTheDocument();
  });

  it("should have save button with full text", () => {
    render(<ConfigTab />);
    expect(screen.getByText(/Save & Reload Style Guide/)).toBeInTheDocument();
  });

  it("should call updateStyleGuide when save is clicked", async () => {
    render(<ConfigTab />);
    
    const saveButton = screen.getByText(/Save & Reload Style Guide/);
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockUpdateStyleGuide).toHaveBeenCalled();
    });
  });
});

describe("ConfigTab - Credo Editor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display credo content when credo tab is selected", () => {
    render(<ConfigTab />);
    
    // Switch to credo tab
    fireEvent.click(screen.getByText("Credo & Values"));
    
    expect(screen.getByDisplayValue(/values:/)).toBeInTheDocument();
  });

  it("should call updateCredo when save is clicked", async () => {
    render(<ConfigTab />);
    
    // Switch to credo tab
    fireEvent.click(screen.getByText("Credo & Values"));
    
    const saveButton = screen.getByText(/Save & Reload Credo/);
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockUpdateCredo).toHaveBeenCalled();
    });
  });
});

describe("ConfigTab - Constraints Editor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display constraints content when constraints tab is selected", () => {
    render(<ConfigTab />);
    
    // Switch to constraints tab
    fireEvent.click(screen.getByText("Constraints"));
    
    expect(screen.getByDisplayValue(/rules:/)).toBeInTheDocument();
  });

  it("should call updateConstraints when save is clicked", async () => {
    render(<ConfigTab />);
    
    // Switch to constraints tab
    fireEvent.click(screen.getByText("Constraints"));
    
    const saveButton = screen.getByText(/Save & Reload Constraints/);
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockUpdateConstraints).toHaveBeenCalled();
    });
  });
});
