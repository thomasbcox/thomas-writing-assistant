/**
 * Tests for CreateCapsuleForm component
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the API hook before importing - use relative path
const mockMutate = jest.fn();

jest.unstable_mockModule("../../hooks/useIPC", () => ({
  api: {
    capsule: {
      create: {
        useMutation: (options?: { onSuccess?: () => void; onError?: () => void }) => ({
          mutate: (data: any) => {
            mockMutate(data);
            // Simulate success
            options?.onSuccess?.();
          },
          mutateAsync: jest.fn(),
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

// Import after mocking
const { CreateCapsuleForm } = await import("../../components/capsules/CreateCapsuleForm");

describe("CreateCapsuleForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render form toggle button", () => {
    render(<CreateCapsuleForm />);

    expect(screen.getByText("Create New Capsule")).toBeInTheDocument();
    expect(screen.getByText("Show Form")).toBeInTheDocument();
  });

  it("should show form when toggle is clicked", () => {
    render(<CreateCapsuleForm />);

    const toggleButton = screen.getByText("Show Form");
    fireEvent.click(toggleButton);

    expect(screen.getByText("Hide Form")).toBeInTheDocument();
    expect(screen.getByText("Title/Topic")).toBeInTheDocument();
    expect(screen.getByText("Promise")).toBeInTheDocument();
    expect(screen.getByText("CTA (Call-to-Action)")).toBeInTheDocument();
  });

  it("should hide form when toggle is clicked again", () => {
    render(<CreateCapsuleForm />);

    // Show form
    const toggleButton = screen.getByText("Show Form");
    fireEvent.click(toggleButton);
    expect(screen.getByText("Hide Form")).toBeInTheDocument();

    // Hide form
    fireEvent.click(screen.getByText("Hide Form"));
    expect(screen.getByText("Show Form")).toBeInTheDocument();
  });

  it("should render all form fields when visible", () => {
    render(<CreateCapsuleForm />);

    fireEvent.click(screen.getByText("Show Form"));

    expect(screen.getByText("Title/Topic")).toBeInTheDocument();
    expect(screen.getByText("Promise")).toBeInTheDocument();
    expect(screen.getByText("CTA (Call-to-Action)")).toBeInTheDocument();
    expect(screen.getByText("Offer Mapping (optional)")).toBeInTheDocument();
    expect(screen.getByText("Create Capsule")).toBeInTheDocument();
  });

  it("should update form fields on input", () => {
    render(<CreateCapsuleForm />);

    fireEvent.click(screen.getByText("Show Form"));

    const inputs = screen.getAllByRole("textbox");
    const titleInput = inputs[0];
    
    fireEvent.change(titleInput, { target: { value: "Test Capsule Title" } });
    expect(titleInput).toHaveValue("Test Capsule Title");
  });

  it("should call mutation when form is submitted", async () => {
    const mockOnSuccess = jest.fn();
    render(<CreateCapsuleForm onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByText("Show Form"));

    // Fill in required fields
    const inputs = screen.getAllByRole("textbox");
    
    // Fill title
    fireEvent.change(inputs[0], { target: { value: "Test Title" } });
    
    // Fill promise (textarea)
    fireEvent.change(inputs[1], { target: { value: "Test Promise" } });
    
    // Fill CTA
    fireEvent.change(inputs[2], { target: { value: "Test CTA" } });

    // Submit form
    const submitButton = screen.getByText("Create Capsule");
    fireEvent.click(submitButton);

    // Verify mutation was called
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("should render optional offer mapping field", () => {
    render(<CreateCapsuleForm />);

    fireEvent.click(screen.getByText("Show Form"));

    expect(screen.getByText("Offer Mapping (optional)")).toBeInTheDocument();
  });
});

describe("CreateCapsuleForm - Initial State", () => {
  it("should start with form hidden", () => {
    render(<CreateCapsuleForm />);
    
    expect(screen.getByText("Show Form")).toBeInTheDocument();
    expect(screen.queryByText("Title/Topic")).not.toBeInTheDocument();
  });
});
