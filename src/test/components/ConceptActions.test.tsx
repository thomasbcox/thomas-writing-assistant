/**
 * Tests for ConceptActions component
 * Tests checkbox toggle, purge button, and confirm dialog
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.unstable_mockModule("../../components/ui/ConfirmDialog", () => ({
  ConfirmDialog: ({ isOpen, title, message, confirmText, onConfirm, onCancel, variant }: any) => (
    isOpen ? (
      <div data-testid="confirm-dialog">
        <div data-testid="dialog-title">{title}</div>
        <div data-testid="dialog-message">{message}</div>
        <button data-testid="dialog-confirm" onClick={onConfirm}>{confirmText}</button>
        <button data-testid="dialog-cancel" onClick={onCancel}>Cancel</button>
        <div data-testid="dialog-variant">{variant}</div>
      </div>
    ) : null
  ),
}));

jest.unstable_mockModule("../../components/ui/LoadingSpinner", () => ({
  LoadingSpinner: ({ size }: any) => <div data-testid={`loading-spinner-${size || "default"}`}>Loading</div>,
}));

describe("ConceptActions", () => {
  const mockOnToggleTrash = jest.fn();
  const mockOnPurgeTrash = jest.fn();
  const mockOnSetPurgeConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render checkbox and label", async () => {
    const { ConceptActions } = await import("../../components/ConceptActions");
    render(
      <ConceptActions
        showTrash={false}
        onToggleTrash={mockOnToggleTrash}
        onPurgeTrash={mockOnPurgeTrash}
        purgeConfirm={false}
        onSetPurgeConfirm={mockOnSetPurgeConfirm}
        isPurging={false}
      />
    );

    expect(screen.getByText("Show Trash")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("should call onToggleTrash when checkbox is clicked", async () => {
    const { ConceptActions } = await import("../../components/ConceptActions");
    render(
      <ConceptActions
        showTrash={false}
        onToggleTrash={mockOnToggleTrash}
        onPurgeTrash={mockOnPurgeTrash}
        purgeConfirm={false}
        onSetPurgeConfirm={mockOnSetPurgeConfirm}
        isPurging={false}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(mockOnToggleTrash).toHaveBeenCalledWith(true);
  });

  it("should show purge button when showTrash is true", async () => {
    const { ConceptActions } = await import("../../components/ConceptActions");
    render(
      <ConceptActions
        showTrash={true}
        onToggleTrash={mockOnToggleTrash}
        onPurgeTrash={mockOnPurgeTrash}
        purgeConfirm={false}
        onSetPurgeConfirm={mockOnSetPurgeConfirm}
        isPurging={false}
      />
    );

    expect(screen.getByText("Purge Old Trash")).toBeInTheDocument();
  });

  it("should not show purge button when showTrash is false", async () => {
    const { ConceptActions } = await import("../../components/ConceptActions");
    render(
      <ConceptActions
        showTrash={false}
        onToggleTrash={mockOnToggleTrash}
        onPurgeTrash={mockOnPurgeTrash}
        purgeConfirm={false}
        onSetPurgeConfirm={mockOnSetPurgeConfirm}
        isPurging={false}
      />
    );

    expect(screen.queryByText("Purge Old Trash")).not.toBeInTheDocument();
  });

  it("should call onSetPurgeConfirm when purge button is clicked", async () => {
    const { ConceptActions } = await import("../../components/ConceptActions");
    render(
      <ConceptActions
        showTrash={true}
        onToggleTrash={mockOnToggleTrash}
        onPurgeTrash={mockOnPurgeTrash}
        purgeConfirm={false}
        onSetPurgeConfirm={mockOnSetPurgeConfirm}
        isPurging={false}
      />
    );

    const purgeButton = screen.getByText("Purge Old Trash");
    fireEvent.click(purgeButton);
    expect(mockOnSetPurgeConfirm).toHaveBeenCalledWith(true);
  });

  it("should show loading spinner when isPurging is true", async () => {
    const { ConceptActions } = await import("../../components/ConceptActions");
    render(
      <ConceptActions
        showTrash={true}
        onToggleTrash={mockOnToggleTrash}
        onPurgeTrash={mockOnPurgeTrash}
        purgeConfirm={false}
        onSetPurgeConfirm={mockOnSetPurgeConfirm}
        isPurging={true}
      />
    );

    expect(screen.getByText("Purging...")).toBeInTheDocument();
    expect(screen.getByTestId("loading-spinner-sm")).toBeInTheDocument();
    const purgeButton = screen.getByText("Purging...");
    expect(purgeButton).toBeDisabled();
  });

  it("should show confirm dialog when purgeConfirm is true", async () => {
    const { ConceptActions } = await import("../../components/ConceptActions");
    render(
      <ConceptActions
        showTrash={true}
        onToggleTrash={mockOnToggleTrash}
        onPurgeTrash={mockOnPurgeTrash}
        purgeConfirm={true}
        onSetPurgeConfirm={mockOnSetPurgeConfirm}
        isPurging={false}
      />
    );

    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Purge Trash");
    expect(screen.getByTestId("dialog-variant")).toHaveTextContent("danger");
  });

  it("should call onPurgeTrash and onSetPurgeConfirm when confirm is clicked", async () => {
    const { ConceptActions } = await import("../../components/ConceptActions");
    render(
      <ConceptActions
        showTrash={true}
        onToggleTrash={mockOnToggleTrash}
        onPurgeTrash={mockOnPurgeTrash}
        purgeConfirm={true}
        onSetPurgeConfirm={mockOnSetPurgeConfirm}
        isPurging={false}
      />
    );

    const confirmButton = screen.getByTestId("dialog-confirm");
    fireEvent.click(confirmButton);
    expect(mockOnPurgeTrash).toHaveBeenCalled();
    expect(mockOnSetPurgeConfirm).toHaveBeenCalledWith(false);
  });

  it("should call onSetPurgeConfirm(false) when cancel is clicked", async () => {
    const { ConceptActions } = await import("../../components/ConceptActions");
    render(
      <ConceptActions
        showTrash={true}
        onToggleTrash={mockOnToggleTrash}
        onPurgeTrash={mockOnPurgeTrash}
        purgeConfirm={true}
        onSetPurgeConfirm={mockOnSetPurgeConfirm}
        isPurging={false}
      />
    );

    const cancelButton = screen.getByTestId("dialog-cancel");
    fireEvent.click(cancelButton);
    expect(mockOnSetPurgeConfirm).toHaveBeenCalledWith(false);
  });
});
