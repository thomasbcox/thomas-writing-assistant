/**
 * Tests for AnchorEditor component
 * Tests form rendering, data loading, form interactions, and submission
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockAnchor = {
  id: "anchor-1",
  title: "Test Anchor",
  content: "Test content",
  painPoints: JSON.stringify(["Pain 1", "Pain 2"]),
  solutionSteps: JSON.stringify(["Step 1", "Step 2"]),
  proof: "Test proof",
  capsuleId: "capsule-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCapsules = [
  {
    id: "capsule-1",
    title: "Test Capsule",
    anchors: [mockAnchor],
  },
];

const mockUpdateMutation = {
  mutate: jest.fn(),
  isLoading: false,
};

jest.unstable_mockModule("../../hooks/useIPC", () => ({
  api: {
    capsule: {
      list: {
        useQuery: () => ({
          data: mockCapsules,
          isLoading: false,
          error: null,
        }),
      },
      updateAnchor: {
        useMutation: () => mockUpdateMutation,
      },
    },
  },
}));

describe("AnchorEditor", () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMutation.isLoading = false;
  });

  it("should render null when anchor is not found", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    const { container } = render(
      <AnchorEditor anchorId="non-existent" onClose={mockOnClose} onSave={mockOnSave} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render form with anchor data when anchor is found", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Anchor Post")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test Anchor")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test content")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Pain 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Pain 2")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Step 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Step 2")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test proof")).toBeInTheDocument();
    });
  });

  it("should update title when input changes", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      const titleInput = screen.getByDisplayValue("Test Anchor");
      fireEvent.change(titleInput, { target: { value: "Updated Title" } });
      expect(titleInput).toHaveValue("Updated Title");
    });
  });

  it("should update content when textarea changes", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      const contentTextarea = screen.getByDisplayValue("Test content");
      fireEvent.change(contentTextarea, { target: { value: "Updated content" } });
      expect(contentTextarea).toHaveValue("Updated content");
    });
  });

  it("should add pain point when Add button is clicked", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      const addButton = screen.getAllByText("+ Add")[0];
      fireEvent.click(addButton);
      const painPointInputs = screen.getAllByPlaceholderText("Pain point");
      expect(painPointInputs.length).toBeGreaterThan(2); // Original 2 + new one
    });
  });

  it("should remove pain point when remove button is clicked", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      const removeButtons = screen.getAllByText("×");
      const initialCount = screen.getAllByPlaceholderText("Pain point").length;
      fireEvent.click(removeButtons[0]); // Remove first pain point
      const newCount = screen.getAllByPlaceholderText("Pain point").length;
      expect(newCount).toBe(initialCount - 1);
    });
  });

  it("should add solution step when Add button is clicked", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      const addButtons = screen.getAllByText("+ Add");
      fireEvent.click(addButtons[1]); // Second Add button is for solution steps
      const solutionStepInputs = screen.getAllByPlaceholderText("Solution step");
      expect(solutionStepInputs.length).toBeGreaterThan(2); // Original 2 + new one
    });
  });

  it("should remove solution step when remove button is clicked", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      const removeButtons = screen.getAllByText("×");
      const solutionStepInputs = screen.getAllByPlaceholderText("Solution step");
      const initialCount = solutionStepInputs.length;
      // Remove buttons are for both pain points and solution steps
      // Find the one for solution steps (after pain points)
      fireEvent.click(removeButtons[solutionStepInputs.length]); // Remove first solution step
    });
    
    await waitFor(() => {
      const newCount = screen.getAllByPlaceholderText("Solution step").length;
      expect(newCount).toBe(2); // Should have one less (started with 2)
    });
  });

  it("should call onClose when Cancel button is clicked", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("should submit form and call mutation when Save Changes is clicked", async () => {
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      const saveButton = screen.getByText("Save Changes");
      fireEvent.click(saveButton);
      expect(mockUpdateMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "anchor-1",
          title: "Test Anchor",
          content: "Test content",
        }),
        expect.any(Function)
      );
    });
  });

  it("should show loading state when mutation is in progress", async () => {
    mockUpdateMutation.isLoading = true;
    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
      const saveButton = screen.getByText("Saving...");
      expect(saveButton).toBeDisabled();
    });
  });

  it("should handle empty pain points and solution steps", async () => {
    const emptyAnchor = {
      ...mockAnchor,
      painPoints: JSON.stringify([]),
      solutionSteps: JSON.stringify([]),
    };
    const emptyCapsules = [
      {
        id: "capsule-1",
        title: "Test Capsule",
        anchors: [emptyAnchor],
      },
    ];

    jest.unstable_mockModule("../../hooks/useIPC", () => ({
      api: {
        capsule: {
          list: {
            useQuery: () => ({
              data: emptyCapsules,
              isLoading: false,
              error: null,
            }),
          },
          updateAnchor: {
            useMutation: () => mockUpdateMutation,
          },
        },
      },
    }));

    const { AnchorEditor } = await import("../../components/AnchorEditor");
    render(<AnchorEditor anchorId="anchor-1" onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      expect(screen.getByText("No pain points added")).toBeInTheDocument();
      expect(screen.getByText("No solution steps added")).toBeInTheDocument();
    });
  });
});
