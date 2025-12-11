/**
 * Tests for EmptyState component
 * Last Updated: 2025-12-11
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "~/components/ui/EmptyState";

describe("EmptyState", () => {
  it("should render with title and message", () => {
    render(<EmptyState title="No items" message="There are no items to display" />);

    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("There are no items to display")).toBeInTheDocument();
  });

  it("should render action button when provided", () => {
    const handleAction = jest.fn();
    render(
      <EmptyState
        title="No items"
        message="Create your first item"
        actionLabel="Create Item"
        onAction={handleAction}
      />,
    );

    const button = screen.getByText("Create Item");
    expect(button).toBeInTheDocument();
  });

  it("should call onAction when button is clicked", async () => {
    const handleAction = jest.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        title="No items"
        message="Create your first item"
        actionLabel="Create Item"
        onAction={handleAction}
      />,
    );

    const button = screen.getByText("Create Item");
    await user.click(button);

    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("should render without action button when not provided", () => {
    render(<EmptyState title="No items" message="There are no items" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

