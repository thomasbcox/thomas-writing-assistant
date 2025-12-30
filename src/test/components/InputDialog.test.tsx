/**
 * Tests for InputDialog component
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InputDialog } from "../../components/ui/InputDialog";

describe("InputDialog", () => {
  const defaultProps = {
    isOpen: true,
    title: "Enter Value",
    message: "Please enter a value:",
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  it("should render nothing when isOpen is false", () => {
    const { container } = render(
      <InputDialog {...defaultProps} isOpen={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render dialog when isOpen is true", () => {
    render(<InputDialog {...defaultProps} />);

    expect(screen.getByText("Enter Value")).toBeInTheDocument();
    expect(screen.getByText("Please enter a value:")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should render default button text", () => {
    render(<InputDialog {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("should render custom button text", () => {
    render(
      <InputDialog
        {...defaultProps}
        confirmText="Save"
        cancelText="Discard"
      />
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("should render with placeholder", () => {
    render(
      <InputDialog {...defaultProps} placeholder="Type here..." />
    );

    expect(screen.getByPlaceholderText("Type here...")).toBeInTheDocument();
  });

  it("should render with default value", () => {
    render(
      <InputDialog {...defaultProps} defaultValue="Initial text" />
    );

    expect(screen.getByDisplayValue("Initial text")).toBeInTheDocument();
  });

  it("should update input value on change", () => {
    render(<InputDialog {...defaultProps} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New value" } });

    expect(screen.getByDisplayValue("New value")).toBeInTheDocument();
  });

  it("should call onConfirm with trimmed value when confirm is clicked", () => {
    const onConfirm = jest.fn();
    render(<InputDialog {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  Test value  " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith("Test value");
  });

  it("should not call onConfirm when value is empty", () => {
    const onConfirm = jest.fn();
    render(<InputDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should not call onConfirm when value is only whitespace", () => {
    const onConfirm = jest.fn();
    render(<InputDialog {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should call onCancel when cancel button is clicked", () => {
    const onCancel = jest.fn();
    render(<InputDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should call onConfirm when Enter key is pressed with value", () => {
    const onConfirm = jest.fn();
    render(<InputDialog {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onConfirm).toHaveBeenCalledWith("Test");
  });

  it("should call onCancel when Escape key is pressed", () => {
    const onCancel = jest.fn();
    render(<InputDialog {...defaultProps} onCancel={onCancel} />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should disable confirm button when input is empty", () => {
    render(<InputDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    expect(confirmButton).toBeDisabled();
  });

  it("should enable confirm button when input has value", () => {
    render(<InputDialog {...defaultProps} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Test" } });

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    expect(confirmButton).not.toBeDisabled();
  });

  it("should reset value when dialog reopens", () => {
    const { rerender } = render(
      <InputDialog {...defaultProps} defaultValue="Initial" />
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Changed" } });

    expect(screen.getByDisplayValue("Changed")).toBeInTheDocument();

    // Close and reopen
    rerender(<InputDialog {...defaultProps} isOpen={false} defaultValue="Initial" />);
    rerender(<InputDialog {...defaultProps} isOpen={true} defaultValue="Initial" />);

    expect(screen.getByDisplayValue("Initial")).toBeInTheDocument();
  });
});

