/**
 * Tests for ErrorBoundary component
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ErrorBoundary } from "../../components/ErrorBoundary";

// Suppress console.error for cleaner test output
const originalConsoleError = console.error;

describe("ErrorBoundary", () => {
  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("should render children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("should render default error fallback when error occurs", () => {
    const ThrowError = () => {
      throw new Error("Test error message");
    };
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("should render Try again button in error state", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByRole("button", { name: "Try again" });
    expect(tryAgainButton).toBeInTheDocument();
    expect(tryAgainButton).toHaveClass("bg-red-600");
  });

  it("should render custom fallback component when provided", () => {
    const ThrowError = () => {
      throw new Error("Custom error");
    };
    
    const CustomFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
      <div>
        <span>Custom error: {error.message}</span>
        <button onClick={resetError}>Reset</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error: Custom error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("should have resetError function that is clickable", () => {
    // This tests that the resetError callback exists and can be called
    const ThrowError = () => {
      throw new Error("Reset test error");
    };
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Error is shown
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    
    // Try again button exists
    const tryAgainButton = screen.getByRole("button", { name: "Try again" });
    expect(tryAgainButton).toBeInTheDocument();
    
    // Click the button - this should not throw
    expect(() => fireEvent.click(tryAgainButton)).not.toThrow();
  });

  it("should pass error to custom fallback", () => {
    const ThrowError = () => {
      throw new Error("Specific error message");
    };
    
    const CustomFallback = ({ error }: { error: Error; resetError: () => void }) => (
      <div data-testid="custom-fallback">Error: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    const fallback = screen.getByTestId("custom-fallback");
    expect(fallback).toHaveTextContent("Error: Specific error message");
  });

  it("should catch errors from deeply nested children", () => {
    const DeepNested = () => {
      throw new Error("Deep error");
    };
    
    render(
      <ErrorBoundary>
        <div>
          <div>
            <DeepNested />
          </div>
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Deep error")).toBeInTheDocument();
  });
});
