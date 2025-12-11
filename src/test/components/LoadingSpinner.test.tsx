/**
 * Tests for LoadingSpinner component
 * Last Updated: 2025-12-11
 */

import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { LoadingSpinner } from "~/components/ui/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("should render spinner", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it("should render with small size", () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it("should render with medium size", () => {
    const { container } = render(<LoadingSpinner size="md" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it("should render with large size", () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });
});

