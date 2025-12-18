/**
 * Tests for ConceptList component
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "../utils/test-wrapper";
import { ConceptList } from "~/components/ConceptList";

describe("ConceptList", () => {
  it("renders empty state when no concepts", () => {
    render(
      <TestWrapper>
        <ConceptList
          concepts={[]}
          isLoading={false}
          error={null}
          showTrash={false}
          onView={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onRestore={() => {}}
        />
      </TestWrapper>,
    );

        expect(screen.getByText(/no concepts/i)).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(
      <TestWrapper>
        <ConceptList
          concepts={[]}
          isLoading={true}
          error={null}
          showTrash={false}
          onView={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onRestore={() => {}}
        />
      </TestWrapper>,
    );

    // Should show loading spinner
    expect(screen.queryByText(/no concepts/i)).not.toBeInTheDocument();
  });
});
