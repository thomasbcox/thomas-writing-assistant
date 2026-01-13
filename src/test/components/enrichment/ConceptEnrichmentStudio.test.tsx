/**
 * Tests for ConceptEnrichmentStudio component
 */

import { describe, it, expect, beforeEach, jest, beforeAll } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ComponentTestWrapper, resetMockElectronAPI, getMockElectronAPI } from "../../utils/components";

// Mock the enrichment hooks
const mockAnalyzeMutation = {
  mutateAsync: jest.fn() as jest.MockedFunction<any>,
  isLoading: false,
};

const mockEnrichMetadataMutation = {
  mutateAsync: jest.fn() as jest.MockedFunction<any>,
  isLoading: false,
};

const mockChatMutation = {
  mutateAsync: jest.fn() as jest.MockedFunction<any>,
  isLoading: false,
};

const mockExpandDefinitionMutation = {
  mutateAsync: jest.fn() as jest.MockedFunction<any>,
  isLoading: false,
};

const mockUseConcept = jest.fn() as jest.MockedFunction<any>;
const mockUseCreateConcept = jest.fn() as jest.MockedFunction<any>;
const mockUseUpdateConcept = jest.fn() as jest.MockedFunction<any>;
const mockUseAnalyzeConcept = jest.fn(() => mockAnalyzeMutation);
const mockUseEnrichMetadata = jest.fn(() => mockEnrichMetadataMutation);
const mockUseChatEnrich = jest.fn(() => mockChatMutation);
const mockUseExpandDefinition = jest.fn(() => mockExpandDefinitionMutation);

jest.unstable_mockModule("../../../lib/api/concepts", () => ({
  useConcept: mockUseConcept,
  useCreateConcept: mockUseCreateConcept,
  useUpdateConcept: mockUseUpdateConcept,
}));

jest.unstable_mockModule("../../../lib/api/enrichment", () => ({
  useAnalyzeConcept: mockUseAnalyzeConcept,
  useEnrichMetadata: mockUseEnrichMetadata,
  useChatEnrich: mockUseChatEnrich,
  useExpandDefinition: mockUseExpandDefinition,
}));

jest.unstable_mockModule("../../../components/enrichment/EnrichmentChatPanel", () => ({
  EnrichmentChatPanel: ({ messages, onSendMessage, onQuickAction }: any) => (
    <div data-testid="chat-panel">
      <div data-testid="messages-count">{messages.length}</div>
      <button
        data-testid="send-message-btn"
        onClick={() => onSendMessage("Test message")}
      >
        Send
      </button>
      <button
        data-testid="quick-action-btn"
        onClick={() => onQuickAction({ action: "fetchMetadata", label: "Fetch Metadata" })}
      >
        Quick Action
      </button>
    </div>
  ),
}));

jest.unstable_mockModule("../../../components/enrichment/EnrichmentEditorPanel", () => ({
  EnrichmentEditorPanel: ({ formData, onChange, onApplySuggestion }: any) => (
    <div data-testid="editor-panel">
      <input
        data-testid="title-input"
        value={formData.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <button
        data-testid="apply-suggestion-btn"
        onClick={() => onApplySuggestion({ id: "s1", field: "title", suggestedValue: "New Title" })}
      >
        Apply
      </button>
    </div>
  ),
}));

jest.unstable_mockModule("../../../components/ui/LoadingSpinner", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading</div>,
}));

const mockChatGetOrCreateSessionQuery = jest.fn(() => ({
  data: null,
  isLoading: false,
}));

const mockChatAddMessageMutation = jest.fn(() => {
  const mockMutateAsync = jest.fn() as jest.MockedFunction<any>;
  mockMutateAsync.mockResolvedValue({ id: "msg-1" });
  return {
    mutateAsync: mockMutateAsync,
    isLoading: false,
  };
});

jest.unstable_mockModule("../../../hooks/useIPC", () => ({
  api: {
    chat: {
      getOrCreateSession: {
        useQuery: mockChatGetOrCreateSessionQuery,
      },
      addMessage: {
        useMutation: mockChatAddMessageMutation,
      },
    },
  },
}));

describe("ConceptEnrichmentStudio", () => {
  let ConceptEnrichmentStudio: any;

  beforeAll(async () => {
    // Import component after mocks are set up
    const module = await import("../../../components/enrichment/ConceptEnrichmentStudio");
    ConceptEnrichmentStudio = module.ConceptEnrichmentStudio;
  });

  beforeEach(async () => {
    resetMockElectronAPI();
    jest.clearAllMocks();
    
    // Mock scrollIntoView for DOM elements
    Element.prototype.scrollIntoView = jest.fn() as any;
    
    // Default mocks
    mockUseConcept.mockReturnValue({
      data: null,
      isLoading: false,
    });
    
    mockUseCreateConcept.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });
    
    mockUseUpdateConcept.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });

    mockAnalyzeMutation.mutateAsync.mockReset();
    mockEnrichMetadataMutation.mutateAsync.mockReset();
    mockChatMutation.mutateAsync.mockReset();
    mockExpandDefinitionMutation.mutateAsync.mockReset();
    
    // Reset chat mocks
    (mockChatGetOrCreateSessionQuery as jest.MockedFunction<any>).mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  describe("Rendering", () => {
    it("should render for new concept", async () => {
      const { container } = render(
        <ComponentTestWrapper>
          <ConceptEnrichmentStudio
            initialData={{
              title: "Test Concept",
              description: "Test Description",
              content: "Test Content",
            }}
          />
        </ComponentTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Enrich New Concept")).toBeInTheDocument();
      });

      expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
      expect(screen.getByTestId("editor-panel")).toBeInTheDocument();
    });

    it("should render for existing concept", async () => {
      mockUseConcept.mockReturnValue({
        data: {
          id: "concept-1",
          title: "Existing Concept",
          description: "Existing Description",
          content: "Existing Content",
          creator: "Creator",
          source: "Source",
          year: "2025",
        },
        isLoading: false,
      });

      const { container } = render(
        <ComponentTestWrapper>
          <ConceptEnrichmentStudio conceptId="concept-1" />
        </ComponentTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Enrich Concept")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle analyze mutation error gracefully without crashing", async () => {
      const consoleErrorSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
      
      // Mock analyze to throw an error
      const analyzeError = new Error("Analysis failed");
      mockAnalyzeMutation.mutateAsync.mockRejectedValue(analyzeError);

      render(
        <ComponentTestWrapper>
          <ConceptEnrichmentStudio
            initialData={{
              title: "Test Concept",
              description: "Test Description",
              content: "Test Content",
            }}
          />
        </ComponentTestWrapper>
      );

      // Wait for the useEffect to trigger the analyze mutation
      await waitFor(() => {
        expect(mockAnalyzeMutation.mutateAsync).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify error was caught (console.debug should be called)
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Analysis stopped due to error:",
          analyzeError
        );
      });

      // Verify the app didn't crash - component should still be rendered
      expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
      expect(screen.getByTestId("editor-panel")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it("should handle chat mutation error gracefully", async () => {
      const chatError = new Error("Chat failed");
      mockChatMutation.mutateAsync.mockRejectedValue(chatError);

      render(
        <ComponentTestWrapper>
          <ConceptEnrichmentStudio
            initialData={{
              title: "Test Concept",
              description: "Test Description",
              content: "Test Content",
            }}
          />
        </ComponentTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("send-message-btn")).toBeInTheDocument();
      });

      // Trigger chat message
      fireEvent.click(screen.getByTestId("send-message-btn"));

      // Wait for error handling
      await waitFor(() => {
        expect(mockChatMutation.mutateAsync).toHaveBeenCalled();
      });

      // Verify error message was added to chat
      await waitFor(() => {
        const messagesCount = screen.getByTestId("messages-count");
        expect(messagesCount.textContent).toBe("2"); // User message + error message
      });
    });

    it("should handle quick action error gracefully", async () => {
      const metadataError = new Error("Metadata fetch failed");
      mockEnrichMetadataMutation.mutateAsync.mockRejectedValue(metadataError);

      render(
        <ComponentTestWrapper>
          <ConceptEnrichmentStudio
            initialData={{
              title: "Test Concept",
              description: "Test Description",
              content: "Test Content",
            }}
          />
        </ComponentTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("quick-action-btn")).toBeInTheDocument();
      });

      // Trigger quick action
      fireEvent.click(screen.getByTestId("quick-action-btn"));

      // Wait for error handling
      await waitFor(() => {
        expect(mockEnrichMetadataMutation.mutateAsync).toHaveBeenCalled();
      });

      // Verify error message was added to chat
      await waitFor(() => {
        const messagesCount = screen.getByTestId("messages-count");
        expect(messagesCount.textContent).toBe("1"); // Error message
      });
    });
  });

  describe("Initial Analysis", () => {
    it("should trigger initial analysis when concept loads", async () => {
      const mockResult = {
        initialMessage: "Hello! I can help you enrich this concept.",
        suggestions: [],
        quickActions: [],
      };

      mockAnalyzeMutation.mutateAsync.mockResolvedValue(mockResult);

      render(
        <ComponentTestWrapper>
          <ConceptEnrichmentStudio
            initialData={{
              title: "Test Concept",
              description: "Test Description",
              content: "Test Content",
            }}
          />
        </ComponentTestWrapper>
      );

      // Wait for initial analysis to be triggered
      await waitFor(() => {
        expect(mockAnalyzeMutation.mutateAsync).toHaveBeenCalledWith({
          title: "Test Concept",
          description: "Test Description",
          content: "Test Content",
          creator: "",
          source: "",
          year: "",
        });
      }, { timeout: 3000 });

      // Verify initial message was added
      await waitFor(() => {
        const messagesCount = screen.getByTestId("messages-count");
        expect(messagesCount.textContent).toBe("1");
      });
    });

    it("should not trigger analysis if messages already exist", async () => {
      // Mock the chat session query to return existing messages
      (mockChatGetOrCreateSessionQuery as jest.MockedFunction<any>).mockReturnValue({
        data: {
          id: "session-1",
          conceptId: "concept-1",
          messages: [
            {
              id: "msg-1",
              role: "assistant",
              content: "Existing message",
              createdAt: new Date().toISOString(),
            },
          ],
        },
        isLoading: false,
      });

      mockUseConcept.mockReturnValue({
        data: {
          id: "concept-1",
          title: "Existing Concept",
          description: "Description",
          content: "Content",
          creator: "Creator",
          source: "Source",
          year: "2025",
        },
        isLoading: false,
      });

      render(
        <ComponentTestWrapper>
          <ConceptEnrichmentStudio conceptId="concept-1" />
        </ComponentTestWrapper>
      );

      // Wait a bit to ensure analysis doesn't trigger
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Analysis should not be called because messages exist
      expect(mockAnalyzeMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });
});
