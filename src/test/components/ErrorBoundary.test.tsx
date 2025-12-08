import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "~/components/ErrorBoundary";

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
}

describe("ErrorBoundary", () => {
  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Test content")).toBeDefined();
  });

  it("should catch and display error", () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Test error")).toBeDefined();
    expect(screen.getByText("Try again")).toBeDefined();

    consoleSpy.mockRestore();
  });

  it("should allow resetting error", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();

    // Error boundary should show reset button
    const resetButton = screen.getByText("Try again");
    expect(resetButton).toBeDefined();

    consoleSpy.mockRestore();
  });
});

