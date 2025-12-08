import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ConceptGenerationStatus } from "~/components/ConceptGenerationStatus";

describe("ConceptGenerationStatus", () => {
  it("should not render when not generating", () => {
    const { container } = render(
      <ConceptGenerationStatus isGenerating={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render status when generating", () => {
    render(<ConceptGenerationStatus isGenerating={true} elapsedTime={0} />);

    expect(screen.getByText(/Processing your request/i)).toBeDefined();
    expect(screen.getByText(/This may take 1-3 minutes/i)).toBeDefined();
  });

  it("should display elapsed time", () => {
    render(<ConceptGenerationStatus isGenerating={true} elapsedTime={45} />);

    expect(screen.getByText(/\(45s\)/i)).toBeDefined();
  });

  it("should show warning for long-running operations", () => {
    render(<ConceptGenerationStatus isGenerating={true} elapsedTime={65} />);

    expect(
      screen.getByText(/This is taking longer than usual/i),
    ).toBeDefined();
  });
});
