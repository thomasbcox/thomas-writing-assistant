import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import { TextInputForm } from "~/components/TextInputForm";

describe("TextInputForm", () => {
  const mockHandlers = {
    onTextChange: jest.fn(),
    onInstructionsChange: jest.fn(),
    onMaxCandidatesChange: jest.fn(),
    onDefaultCreatorChange: jest.fn(),
    onDefaultYearChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render all form fields", () => {
    render(
      <TextInputForm
        text=""
        onTextChange={mockHandlers.onTextChange}
        instructions=""
        onInstructionsChange={mockHandlers.onInstructionsChange}
        maxCandidates={5}
        onMaxCandidatesChange={mockHandlers.onMaxCandidatesChange}
        defaultCreator=""
        onDefaultCreatorChange={mockHandlers.onDefaultCreatorChange}
        defaultYear=""
        onDefaultYearChange={mockHandlers.onDefaultYearChange}
      />,
    );

    expect(screen.getByText(/Or Paste Text/i)).toBeInTheDocument();
    expect(screen.getByText(/Instructions/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Concepts/i)).toBeInTheDocument();
    expect(screen.getByText(/Default Creator/i)).toBeInTheDocument();
    expect(screen.getByText(/Default Year/i)).toBeInTheDocument();
  });

  it("should display character count for text", () => {
    render(
      <TextInputForm
        text="Test text"
        onTextChange={mockHandlers.onTextChange}
        instructions=""
        onInstructionsChange={mockHandlers.onInstructionsChange}
        maxCandidates={5}
        onMaxCandidatesChange={mockHandlers.onMaxCandidatesChange}
        defaultCreator=""
        onDefaultCreatorChange={mockHandlers.onDefaultCreatorChange}
        defaultYear=""
        onDefaultYearChange={mockHandlers.onDefaultYearChange}
      />,
    );

    expect(screen.getByText(/9 characters/i)).toBeDefined();
  });

  it("should disable fields when disabled prop is true", () => {
    render(
      <TextInputForm
        text=""
        onTextChange={mockHandlers.onTextChange}
        instructions=""
        onInstructionsChange={mockHandlers.onInstructionsChange}
        maxCandidates={5}
        onMaxCandidatesChange={mockHandlers.onMaxCandidatesChange}
        defaultCreator=""
        onDefaultCreatorChange={mockHandlers.onDefaultCreatorChange}
        defaultYear=""
        onDefaultYearChange={mockHandlers.onDefaultYearChange}
        disabled={true}
      />,
    );

    const textInput = screen.getByPlaceholderText(/Paste your text here/i);
    expect(textInput).toBeDisabled();
  });
});
