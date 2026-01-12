/**
 * Tests for ConceptCreateForm component
 * Tests form rendering, input handling, validation, and submission
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.unstable_mockModule("../../components/ui/LoadingSpinner", () => ({
  LoadingSpinner: ({ size }: any) => <div data-testid={`loading-spinner-${size || "default"}`}>Loading</div>,
}));

describe("ConceptCreateForm", () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render form with all fields", async () => {
    const { ConceptCreateForm } = await import("../../components/ConceptCreateForm");
    render(<ConceptCreateForm onSubmit={mockOnSubmit} isPending={false} />);

    expect(screen.getByText("Create New Concept")).toBeInTheDocument();
    // Labels don't have htmlFor, so find by text and then find associated input
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Short Description")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Year")).toBeInTheDocument();
    expect(screen.getByText("Create Concept")).toBeInTheDocument();
  });

  it("should update title when input changes", async () => {
    const { ConceptCreateForm } = await import("../../components/ConceptCreateForm");
    render(<ConceptCreateForm onSubmit={mockOnSubmit} isPending={false} />);

    // Find input by placeholder or by finding input after label
    const titleLabel = screen.getByText("Title");
    const titleInput = titleLabel.parentElement?.querySelector("input");
    expect(titleInput).toBeDefined();
    if (titleInput) {
      fireEvent.change(titleInput, { target: { value: "Test Title" } });
      expect(titleInput).toHaveValue("Test Title");
    }
  });

  it("should update all form fields when inputs change", async () => {
    const { ConceptCreateForm } = await import("../../components/ConceptCreateForm");
    const { container } = render(<ConceptCreateForm onSubmit={mockOnSubmit} isPending={false} />);

    // Find inputs by their position relative to labels
    const inputs = container.querySelectorAll("input, textarea");
    const titleInput = inputs[0] as HTMLInputElement;
    const descInput = inputs[1] as HTMLInputElement;
    const contentTextarea = inputs[2] as HTMLTextAreaElement;
    const creatorInput = inputs[3] as HTMLInputElement;
    const sourceInput = inputs[4] as HTMLInputElement;
    const yearInput = inputs[5] as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: "Test Title" } });
    fireEvent.change(descInput, { target: { value: "Test Description" } });
    fireEvent.change(contentTextarea, { target: { value: "Test Content" } });
    fireEvent.change(creatorInput, { target: { value: "Test Creator" } });
    fireEvent.change(sourceInput, { target: { value: "Test Source" } });
    fireEvent.change(yearInput, { target: { value: "2024" } });

    expect(titleInput).toHaveValue("Test Title");
    expect(descInput).toHaveValue("Test Description");
    expect(contentTextarea).toHaveValue("Test Content");
    expect(creatorInput).toHaveValue("Test Creator");
    expect(sourceInput).toHaveValue("Test Source");
    expect(yearInput).toHaveValue("2024");
  });

  it("should call onSubmit with form data when form is submitted", async () => {
    const { ConceptCreateForm } = await import("../../components/ConceptCreateForm");
    const { container } = render(<ConceptCreateForm onSubmit={mockOnSubmit} isPending={false} />);

    const inputs = container.querySelectorAll("input, textarea");
    const titleInput = inputs[0] as HTMLInputElement;
    const contentTextarea = inputs[2] as HTMLTextAreaElement;
    const creatorInput = inputs[3] as HTMLInputElement;
    const sourceInput = inputs[4] as HTMLInputElement;
    const yearInput = inputs[5] as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: "Test Title" } });
    fireEvent.change(contentTextarea, { target: { value: "Test Content" } });
    fireEvent.change(creatorInput, { target: { value: "Test Creator" } });
    fireEvent.change(sourceInput, { target: { value: "Test Source" } });
    fireEvent.change(yearInput, { target: { value: "2024" } });

    const submitButton = screen.getByText("Create Concept");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: "Test Title",
        description: "",
        content: "Test Content",
        creator: "Test Creator",
        source: "Test Source",
        year: "2024",
      });
    });
  });

  it("should not call onSubmit if title is empty", async () => {
    const { ConceptCreateForm } = await import("../../components/ConceptCreateForm");
    const { container } = render(<ConceptCreateForm onSubmit={mockOnSubmit} isPending={false} />);

    const inputs = container.querySelectorAll("input, textarea");
    const contentTextarea = inputs[2] as HTMLTextAreaElement;
    fireEvent.change(contentTextarea, { target: { value: "Test Content" } });
    const submitButton = screen.getByText("Create Concept");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it("should not call onSubmit if content is empty", async () => {
    const { ConceptCreateForm } = await import("../../components/ConceptCreateForm");
    const { container } = render(<ConceptCreateForm onSubmit={mockOnSubmit} isPending={false} />);

    const inputs = container.querySelectorAll("input, textarea");
    const titleInput = inputs[0] as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Test Title" } });
    const submitButton = screen.getByText("Create Concept");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it("should reset form after successful submission", async () => {
    const { ConceptCreateForm } = await import("../../components/ConceptCreateForm");
    const { container } = render(<ConceptCreateForm onSubmit={mockOnSubmit} isPending={false} />);

    const inputs = container.querySelectorAll("input, textarea");
    const titleInput = inputs[0] as HTMLInputElement;
    const contentTextarea = inputs[2] as HTMLTextAreaElement;
    const creatorInput = inputs[3] as HTMLInputElement;
    const sourceInput = inputs[4] as HTMLInputElement;
    const yearInput = inputs[5] as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: "Test Title" } });
    fireEvent.change(contentTextarea, { target: { value: "Test Content" } });
    fireEvent.change(creatorInput, { target: { value: "Test Creator" } });
    fireEvent.change(sourceInput, { target: { value: "Test Source" } });
    fireEvent.change(yearInput, { target: { value: "2024" } });

    const submitButton = screen.getByText("Create Concept");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(titleInput).toHaveValue("");
      expect(contentTextarea).toHaveValue("");
      expect(creatorInput).toHaveValue("");
      expect(sourceInput).toHaveValue("");
      expect(yearInput).toHaveValue("");
    });
  });

  it("should show loading state when isPending is true", async () => {
    const { ConceptCreateForm } = await import("../../components/ConceptCreateForm");
    render(<ConceptCreateForm onSubmit={mockOnSubmit} isPending={true} />);

    expect(screen.getByText("Creating...")).toBeInTheDocument();
    expect(screen.getByTestId("loading-spinner-sm")).toBeInTheDocument();
    const submitButton = screen.getByText("Creating...");
    expect(submitButton).toBeDisabled();
  });

  it("should disable all inputs when isPending is true", async () => {
    const { ConceptCreateForm } = await import("../../components/ConceptCreateForm");
    const { container } = render(<ConceptCreateForm onSubmit={mockOnSubmit} isPending={true} />);

    const inputs = container.querySelectorAll("input, textarea");
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });
});
