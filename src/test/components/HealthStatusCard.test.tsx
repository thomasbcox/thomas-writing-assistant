/**
 * Tests for HealthStatusCard component
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the health API hook before importing - use relative path
const mockRefetch = jest.fn();
const mockHealthData = {
  status: "healthy" as const,
  checks: {
    database: "healthy" as const,
    config: "healthy" as const,
  },
  issues: undefined,
  responseTime: 50,
  uptime: new Date().toISOString(),
};

jest.unstable_mockModule("../../lib/api/health", () => ({
  useHealthStatus: () => ({
    data: mockHealthData,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

// Import after mocking
const { HealthStatusCard } = await import("../../components/ui/HealthStatusCard");

describe("HealthStatusCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render health status card with healthy status", () => {
    render(<HealthStatusCard />);

    expect(screen.getByText("⚡ System Health")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("Configuration")).toBeInTheDocument();
  });

  it("should display database status as Connected when healthy", () => {
    render(<HealthStatusCard />);

    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText(/Connected/)).toBeInTheDocument();
  });

  it("should display configuration status", () => {
    render(<HealthStatusCard />);

    expect(screen.getByText("Configuration")).toBeInTheDocument();
    expect(screen.getByText("All config files loaded")).toBeInTheDocument();
  });

  it("should render refresh button", () => {
    render(<HealthStatusCard />);

    const refreshButton = screen.getByText("Refresh");
    expect(refreshButton).toBeInTheDocument();
  });

  it("should call refetch when refresh button is clicked", () => {
    render(<HealthStatusCard />);

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("should show green status icon when healthy", () => {
    render(<HealthStatusCard />);
    
    // The component uses emoji status icons
    expect(screen.getAllByText("🟢").length).toBeGreaterThan(0);
  });

  it("should show response time when provided", () => {
    render(<HealthStatusCard />);
    
    // Response time of 50ms should be displayed
    expect(screen.getByText(/50ms/)).toBeInTheDocument();
  });
});

describe("HealthStatusCard - Structure", () => {
  it("should render without crashing", () => {
    render(<HealthStatusCard />);
    expect(screen.getByText("⚡ System Health")).toBeInTheDocument();
  });

  it("should have last checked timestamp", () => {
    render(<HealthStatusCard />);
    expect(screen.getByText(/Last checked:/)).toBeInTheDocument();
  });
});
