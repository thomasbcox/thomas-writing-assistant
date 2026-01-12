/**
 * Tests for SettingsTab component
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock settings data
const mockSettings = {
  provider: "openai" as const,
  model: "gpt-4o-mini",
  temperature: 0.7,
  availableProviders: {
    openai: true,
    gemini: false,
  },
};

const mockModels = {
  provider: "openai" as const,
  models: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Cheap)" },
    { value: "gpt-4o", label: "GPT-4o (Balanced)" },
  ],
};

const mockRefetch = jest.fn();
const mockMutate = jest.fn();

// Mock the hooks module before importing component - use relative path
jest.unstable_mockModule("../../hooks/useIPC", () => ({
  api: {
    ai: {
      getSettings: {
        useQuery: () => ({
          data: mockSettings,
          isLoading: false,
          error: null,
          refetch: mockRefetch,
        }),
      },
      getAvailableModels: {
        useQuery: () => ({
          data: mockModels,
          isLoading: false,
          error: null,
        }),
      },
      getEmbeddingStatus: {
        useQuery: () => ({
          data: {
            totalConcepts: 0,
            conceptsWithEmbeddings: 0,
            conceptsWithoutEmbeddings: 0,
            isIndexing: false,
            lastIndexedAt: null,
          },
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        }),
      },
      generateMissingEmbeddings: {
        useMutation: (options?: { onSuccess?: () => void }) => ({
          mutate: (data: any) => {
            options?.onSuccess?.();
          },
          isLoading: false,
          error: null,
        }),
      },
      retryFailedEmbeddings: {
        useMutation: (options?: { onSuccess?: () => void }) => ({
          mutate: (data: any) => {
            options?.onSuccess?.();
          },
          isLoading: false,
          error: null,
        }),
      },
      updateSettings: {
        useMutation: (options?: { onSuccess?: () => void }) => ({
          mutate: (data: any) => {
            mockMutate(data);
            options?.onSuccess?.();
          },
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

// Import after mocking
const { SettingsTab } = await import("../../components/SettingsTab");

describe("SettingsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render AI settings header", () => {
    render(<SettingsTab />);
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
  });

  it("should render provider selection", () => {
    render(<SettingsTab />);
    expect(screen.getByText("Provider")).toBeInTheDocument();
  });

  it("should render model selection", () => {
    render(<SettingsTab />);
    expect(screen.getByText("Model")).toBeInTheDocument();
  });

  it("should render temperature slider with value", () => {
    render(<SettingsTab />);
    // The label is "Temperature: 0.7"
    expect(screen.getByText("Temperature: 0.7")).toBeInTheDocument();
  });

  it("should render save button", () => {
    render(<SettingsTab />);
    expect(screen.getByText("Save Settings")).toBeInTheDocument();
  });

  it("should render reset button", () => {
    render(<SettingsTab />);
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("should call updateSettings when save is clicked", async () => {
    render(<SettingsTab />);

    const saveButton = screen.getByText("Save Settings");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("should display current settings in info box", () => {
    render(<SettingsTab />);
    
    // Check for current settings display
    expect(screen.getByText("Current Settings")).toBeInTheDocument();
    expect(screen.getByText("openai")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
  });
});

describe("SettingsTab - Render Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    render(<SettingsTab />);
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
  });

  it("should render OpenAI option when available", () => {
    render(<SettingsTab />);
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
  });
});
