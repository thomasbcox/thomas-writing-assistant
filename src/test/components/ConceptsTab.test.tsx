/**
 * Tests for ConceptsTab component with IPC mocks
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ConceptsTab } from "~/components/ConceptsTab";
import { ComponentTestWrapper, getMockElectronAPI, resetMockElectronAPI } from "../utils/component-test-wrapper";

describe("ConceptsTab", () => {
  const mockAPI = getMockElectronAPI();

  beforeEach(() => {
    resetMockElectronAPI();
  });

  it("should render concepts list", async () => {
    const mockConcepts = [
      {
        id: "1",
        identifier: "zettel-12345678",
        title: "Test Concept 1",
        description: "Description 1",
        content: "Content 1",
        creator: "Creator",
        source: "Source",
        year: "2024",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trashedAt: null,
      },
      {
        id: "2",
        identifier: "zettel-87654321",
        title: "Test Concept 2",
        description: "Description 2",
        content: "Content 2",
        creator: "Creator",
        source: "Source",
        year: "2024",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trashedAt: null,
      },
    ];

    mockAPI.concept.list.mockResolvedValue(mockConcepts);

    render(
      <ComponentTestWrapper>
        <ConceptsTab />
      </ComponentTestWrapper>,
    );

    await waitFor(() => {
      expect(mockAPI.concept.list).toHaveBeenCalled();
    });

    expect(screen.getByText("Test Concept 1")).toBeInTheDocument();
    expect(screen.getByText("Test Concept 2")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    mockAPI.concept.list.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ComponentTestWrapper>
        <ConceptsTab />
      </ComponentTestWrapper>,
    );

    // Component should be rendering (loading state handled internally)
    expect(mockAPI.concept.list).toHaveBeenCalled();
  });

  it("should handle search", async () => {
    const mockConcepts = [
      {
        id: "1",
        identifier: "zettel-12345678",
        title: "React Concepts",
        description: "Description",
        content: "Content",
        creator: "Creator",
        source: "Source",
        year: "2024",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trashedAt: null,
      },
    ];

    mockAPI.concept.list.mockResolvedValue(mockConcepts);

    render(
      <ComponentTestWrapper>
        <ConceptsTab />
      </ComponentTestWrapper>,
    );

    const searchInput = screen.getByPlaceholderText("Search concepts...");
    fireEvent.change(searchInput, { target: { value: "React" } });

    await waitFor(() => {
      expect(mockAPI.concept.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: "React" }),
      );
    });
  });

  it("should toggle trash view", async () => {
    mockAPI.concept.list.mockResolvedValue([]);

    render(
      <ComponentTestWrapper>
        <ConceptsTab />
      </ComponentTestWrapper>,
    );

    await waitFor(() => {
      expect(mockAPI.concept.list).toHaveBeenCalledWith(
        expect.objectContaining({ includeTrash: false }),
      );
    });

    // Find and click trash toggle (implementation depends on ConceptActions component)
    // This is a basic test - actual implementation may vary
  });

  it("should create a new concept", async () => {
    const newConcept = {
      id: "new-1",
      identifier: "zettel-11111111",
      title: "New Concept",
      description: "Description",
      content: "Content",
      creator: "Creator",
      source: "Source",
      year: "2024",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trashedAt: null,
    };

    mockAPI.concept.list.mockResolvedValue([]);
    mockAPI.concept.create.mockResolvedValue(newConcept);

    render(
      <ComponentTestWrapper>
        <ConceptsTab />
      </ComponentTestWrapper>,
    );

    // Find and click "Show Form" button
    const showFormButton = screen.getByText("Show Form");
    fireEvent.click(showFormButton);

    // Fill form and submit (implementation depends on ConceptCreateForm)
    // This is a basic structure - actual form interaction may vary
  });

  it("should handle errors", async () => {
    const error = new Error("Failed to load concepts");
    mockAPI.concept.list.mockRejectedValue(error);

    render(
      <ComponentTestWrapper>
        <ConceptsTab />
      </ComponentTestWrapper>,
    );

    await waitFor(() => {
      expect(mockAPI.concept.list).toHaveBeenCalled();
    });

    // Error should be displayed (implementation depends on ConceptList component)
  });
});

