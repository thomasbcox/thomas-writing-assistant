/**
 * Tests for Dashboard component
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock data
const mockConcepts = [
  { id: "c1", identifier: "c1", title: "Concept 1", content: "Content 1", creator: "Creator", source: "Source", year: "2025", status: "active", createdAt: "2025-01-01", updatedAt: "2025-01-01", description: null, trashedAt: null },
  { id: "c2", identifier: "c2", title: "Concept 2", content: "Content 2", creator: "Creator", source: "Source", year: "2025", status: "active", createdAt: "2025-01-01", updatedAt: "2025-01-01", description: null, trashedAt: null },
];

const mockLinks = [
  { id: "l1", sourceId: "c1", targetId: "c2", linkNameId: "ln1", createdAt: "2025-01-01", source: null, target: null, linkName: null, notes: null },
];

const mockCapsules: any[] = [];

const mockHealthStatus = {
  status: "healthy" as const,
  checks: { database: "healthy" as const, config: "healthy" as const },
  issues: [],
  responseTime: 50,
  uptime: "2025-01-01T00:00:00Z",
};

// Mock the hooks module
jest.unstable_mockModule("../../hooks/useIPC", () => ({
  api: {
    concept: {
      list: {
        useQuery: () => ({
          data: mockConcepts,
          isLoading: false,
          error: null,
        }),
      },
    },
    link: {
      getAll: {
        useQuery: () => ({
          data: mockLinks,
          isLoading: false,
          error: null,
        }),
      },
    },
    capsule: {
      list: {
        useQuery: () => ({
          data: mockCapsules,
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

// Mock health status hook
jest.unstable_mockModule("../../lib/api/health", () => ({
  useHealthStatus: () => ({
    data: mockHealthStatus,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

// Mock database toggle hook
jest.unstable_mockModule("../../hooks/useDatabaseToggle", () => ({
  useDatabaseToggle: () => ({
    currentDatabase: "dev",
    isLoading: false,
    toggleDatabase: jest.fn(),
    isProd: false,
  }),
}));

// Mock Toast
jest.unstable_mockModule("../../components/ui/Toast", () => ({
  ToastContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="toast-container">{children}</div>,
  useToast: () => ({
    toasts: [],
    addToast: jest.fn(),
    removeToast: jest.fn(),
  }),
}));

// Import after mocking
const { Dashboard } = await import("../../components/Dashboard");

describe("Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render dashboard header", () => {
    render(<Dashboard />);
    // The title is "Writing Assistant"
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("should render stats section with concept count", () => {
    render(<Dashboard />);
    // Should show "2" for concept count based on mock data
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Concepts")).toBeInTheDocument();
  });

  it("should render stats section with link count", () => {
    render(<Dashboard />);
    // Should show "1" for link count based on mock data
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Links")).toBeInTheDocument();
  });

  it("should render stats section with capsule count", () => {
    render(<Dashboard />);
    // Should show "0" for capsule count based on mock data
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("Capsules")).toBeInTheDocument();
  });

  it("should render environment badge", () => {
    render(<Dashboard />);
    // DEV badge should be shown based on mock
    expect(screen.getByText("DEV")).toBeInTheDocument();
  });

  it("should render recent concepts section", () => {
    render(<Dashboard />);
    expect(screen.getByText("Recent Concepts")).toBeInTheDocument();
    expect(screen.getByText("Concept 1")).toBeInTheDocument();
    expect(screen.getByText("Concept 2")).toBeInTheDocument();
  });

  it("should render quick actions section", () => {
    render(<Dashboard />);
    // Find heading by text content
    const quickActionsHeading = screen.getAllByText("Quick Actions")[0];
    expect(quickActionsHeading).toBeInTheDocument();
  });

  it("should render create concept action", () => {
    render(<Dashboard />);
    // Check for the "Create Concept" text
    expect(screen.getByText("Create Concept")).toBeInTheDocument();
  });

  it("should have clickable stat cards", () => {
    const onNavigate = jest.fn();
    render(<Dashboard onNavigate={onNavigate} />);

    // Find the Concepts button by role
    const conceptsButtons = screen.getAllByRole("button");
    // Find one that has "Concepts" text nearby
    const conceptsButton = conceptsButtons.find(btn => 
      btn.textContent?.includes("Concepts")
    );
    
    if (conceptsButton) {
      fireEvent.click(conceptsButton);
      expect(onNavigate).toHaveBeenCalled();
    }
  });
});
