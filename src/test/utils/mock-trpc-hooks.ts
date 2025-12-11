/**
 * Centralized tRPC hook mocks for component testing
 * This module provides mock implementations that can be used across all component tests
 * 
 * Last Updated: 2025-12-11
 */

import { jest } from "@jest/globals";

// Create mock functions that can be accessed from tests
export const mockCapsuleListUseQuery = jest.fn();
export const mockCapsuleGetByIdUseQuery = jest.fn();
export const mockCapsuleCreateUseMutation = jest.fn();
export const mockCreateAnchorFromPDFUseMutation = jest.fn();
export const mockRegenerateRepurposedContentUseMutation = jest.fn();
export const mockUpdateAnchorUseMutation = jest.fn();
export const mockDeleteAnchorUseMutation = jest.fn();
export const mockUpdateRepurposedContentUseMutation = jest.fn();
export const mockDeleteRepurposedContentUseMutation = jest.fn();

export const mockConceptListUseQuery = jest.fn();
export const mockConceptGetByIdUseQuery = jest.fn();
export const mockConceptCreateUseMutation = jest.fn();
export const mockConceptGenerateCandidatesUseMutation = jest.fn();
export const mockConceptDeleteUseMutation = jest.fn();
export const mockConceptRestoreUseMutation = jest.fn();
export const mockConceptPurgeTrashUseMutation = jest.fn();

export const mockLinkGetByConceptUseQuery = jest.fn();
export const mockLinkCreateUseMutation = jest.fn();
export const mockLinkDeleteUseMutation = jest.fn();
export const mockLinkProposeUseMutation = jest.fn();

export const mockConfigGetUseQuery = jest.fn();
export const mockConfigGetStatusUseQuery = jest.fn();
export const mockConfigGetStyleGuideRawUseQuery = jest.fn();
export const mockConfigGetCredoRawUseQuery = jest.fn();
export const mockConfigGetConstraintsRawUseQuery = jest.fn();
export const mockConfigUpdateUseMutation = jest.fn();
export const mockConfigUpdateStyleGuideUseMutation = jest.fn();
export const mockConfigUpdateCredoUseMutation = jest.fn();
export const mockConfigUpdateConstraintsUseMutation = jest.fn();

export const mockAIGetSettingsUseQuery = jest.fn();
export const mockAIUpdateSettingsUseMutation = jest.fn();
export const mockAIGetAvailableModelsUseQuery = jest.fn();

export const mockPDFExtractTextUseMutation = jest.fn();

/**
 * Create the mock tRPC API object
 * This creates a proxy object that intercepts all tRPC hook calls
 */
export function createMockTRPCAPI() {
  // Create a proxy that intercepts property access
  const createProxy = (path: string[] = []): any => {
    return new Proxy(
      {},
      {
        get(_target, prop: string | symbol) {
          const fullPath = [...path, prop.toString()];
          
          // If accessing useQuery or useMutation, return the appropriate mock
          if (prop === "useQuery") {
            return (...args: unknown[]) => {
              // Find the appropriate mock based on the path
              const pathStr = path.join(".");
              if (pathStr === "capsule.list") return mockCapsuleListUseQuery(...args);
              if (pathStr === "capsule.getById") return mockCapsuleGetByIdUseQuery(...args);
              if (pathStr === "concept.list") return mockConceptListUseQuery(...args);
              if (pathStr === "concept.getById") return mockConceptGetByIdUseQuery(...args);
              if (pathStr === "link.getByConcept") return mockLinkGetByConceptUseQuery(...args);
              if (pathStr === "config.get") return mockConfigGetUseQuery(...args);
              if (pathStr === "config.getStatus") return mockConfigGetStatusUseQuery(...args);
              if (pathStr === "config.getStyleGuideRaw") return mockConfigGetStyleGuideRawUseQuery(...args);
              if (pathStr === "config.getCredoRaw") return mockConfigGetCredoRawUseQuery(...args);
              if (pathStr === "config.getConstraintsRaw") return mockConfigGetConstraintsRawUseQuery(...args);
              if (pathStr === "ai.getSettings") return mockAIGetSettingsUseQuery(...args);
              if (pathStr === "ai.getAvailableModels") return mockAIGetAvailableModelsUseQuery(...args);
              // Default fallback
              return { data: undefined, isLoading: false, refetch: jest.fn() };
            };
          }
          
          if (prop === "useMutation") {
            return () => {
              const pathStr = path.join(".");
              if (pathStr === "capsule.create") return mockCapsuleCreateUseMutation();
              if (pathStr === "capsule.createAnchorFromPDF") return mockCreateAnchorFromPDFUseMutation();
              if (pathStr === "capsule.regenerateRepurposedContent") return mockRegenerateRepurposedContentUseMutation();
              if (pathStr === "capsule.updateAnchor") return mockUpdateAnchorUseMutation();
              if (pathStr === "capsule.deleteAnchor") return mockDeleteAnchorUseMutation();
              if (pathStr === "capsule.updateRepurposedContent") return mockUpdateRepurposedContentUseMutation();
              if (pathStr === "capsule.deleteRepurposedContent") return mockDeleteRepurposedContentUseMutation();
              if (pathStr === "concept.create") return mockConceptCreateUseMutation();
              if (pathStr === "concept.generateCandidates") return mockConceptGenerateCandidatesUseMutation();
              if (pathStr === "concept.delete") return mockConceptDeleteUseMutation();
              if (pathStr === "concept.restore") return mockConceptRestoreUseMutation();
              if (pathStr === "concept.purgeTrash") return mockConceptPurgeTrashUseMutation();
              if (pathStr === "link.create") return mockLinkCreateUseMutation();
              if (pathStr === "link.delete") return mockLinkDeleteUseMutation();
              if (pathStr === "linkName.propose") return mockLinkProposeUseMutation();
              if (pathStr === "config.update") return mockConfigUpdateUseMutation();
              if (pathStr === "config.updateStyleGuide") return mockConfigUpdateStyleGuideUseMutation();
              if (pathStr === "config.updateCredo") return mockConfigUpdateCredoUseMutation();
              if (pathStr === "config.updateConstraints") return mockConfigUpdateConstraintsUseMutation();
              if (pathStr === "ai.updateSettings") return mockAIUpdateSettingsUseMutation();
              if (pathStr === "pdf.extractText") return mockPDFExtractTextUseMutation();
              // Default fallback
              return { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false, error: null };
            };
          }
          
          // Continue building the path for nested properties
          return createProxy(fullPath);
        },
      },
    );
  };
  
  return createProxy();
}

/**
 * Legacy function - kept for backward compatibility
 * Creates a simple object structure (doesn't work with tRPC hooks)
 */
export function createMockTRPCAPILegacy() {
  return {
    capsule: {
      list: {
        useQuery: (...args: unknown[]) => mockCapsuleListUseQuery(...args),
      },
      getById: {
        useQuery: (...args: unknown[]) => mockCapsuleGetByIdUseQuery(...args),
      },
      create: {
        useMutation: () => mockCapsuleCreateUseMutation(),
      },
      createAnchorFromPDF: {
        useMutation: () => mockCreateAnchorFromPDFUseMutation(),
      },
      regenerateRepurposedContent: {
        useMutation: () => mockRegenerateRepurposedContentUseMutation(),
      },
      updateAnchor: {
        useMutation: () => mockUpdateAnchorUseMutation(),
      },
      deleteAnchor: {
        useMutation: () => mockDeleteAnchorUseMutation(),
      },
      updateRepurposedContent: {
        useMutation: () => mockUpdateRepurposedContentUseMutation(),
      },
      deleteRepurposedContent: {
        useMutation: () => mockDeleteRepurposedContentUseMutation(),
      },
    },
    concept: {
      list: {
        useQuery: (...args: unknown[]) => mockConceptListUseQuery(...args),
      },
      getById: {
        useQuery: (...args: unknown[]) => mockConceptGetByIdUseQuery(...args),
      },
      create: {
        useMutation: () => mockConceptCreateUseMutation(),
      },
      generateCandidates: {
        useMutation: () => mockConceptGenerateCandidatesUseMutation(),
      },
      delete: {
        useMutation: () => mockConceptDeleteUseMutation(),
      },
      restore: {
        useMutation: () => mockConceptRestoreUseMutation(),
      },
      purgeTrash: {
        useMutation: () => mockConceptPurgeTrashUseMutation(),
      },
    },
    pdf: {
      extractText: {
        useMutation: () => mockPDFExtractTextUseMutation(),
      },
    },
    link: {
      getByConcept: {
        useQuery: (...args: unknown[]) => mockLinkGetByConceptUseQuery(...args),
      },
      create: {
        useMutation: () => mockLinkCreateUseMutation(),
      },
      delete: {
        useMutation: () => mockLinkDeleteUseMutation(),
      },
    },
    linkName: {
      list: {
        useQuery: jest.fn(() => ({ data: [], isLoading: false })),
      },
      propose: {
        useMutation: () => mockLinkProposeUseMutation(),
      },
    },
    config: {
      get: {
        useQuery: (...args: unknown[]) => mockConfigGetUseQuery(...args),
      },
      getStatus: {
        useQuery: (...args: unknown[]) => mockConfigGetStatusUseQuery(...args),
      },
      getStyleGuideRaw: {
        useQuery: (...args: unknown[]) => mockConfigGetStyleGuideRawUseQuery(...args),
      },
      getCredoRaw: {
        useQuery: (...args: unknown[]) => mockConfigGetCredoRawUseQuery(...args),
      },
      getConstraintsRaw: {
        useQuery: (...args: unknown[]) => mockConfigGetConstraintsRawUseQuery(...args),
      },
      update: {
        useMutation: () => mockConfigUpdateUseMutation(),
      },
      updateStyleGuide: {
        useMutation: () => mockConfigUpdateStyleGuideUseMutation(),
      },
      updateCredo: {
        useMutation: () => mockConfigUpdateCredoUseMutation(),
      },
      updateConstraints: {
        useMutation: () => mockConfigUpdateConstraintsUseMutation(),
      },
    },
    ai: {
      getSettings: {
        useQuery: (...args: unknown[]) => mockAIGetSettingsUseQuery(...args),
      },
      updateSettings: {
        useMutation: () => mockAIUpdateSettingsUseMutation(),
      },
      getAvailableModels: {
        useQuery: (...args: unknown[]) => mockAIGetAvailableModelsUseQuery(...args),
      },
    },
  };
}

/**
 * Reset all mocks (call in beforeEach)
 */
export function resetAllTRPCMocks() {
  jest.clearAllMocks();
  // Reset to default return values
  mockCapsuleListUseQuery.mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  });
  mockConceptListUseQuery.mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  });
  mockLinkGetByConceptUseQuery.mockReturnValue({
    data: { outgoing: [], incoming: [] },
    isLoading: false,
    refetch: jest.fn(),
  });
  mockConfigGetUseQuery.mockReturnValue({
    data: { styleGuide: "", credo: "", constraints: "" },
    isLoading: false,
  });
  mockConfigGetStatusUseQuery.mockReturnValue({
    data: {
      styleGuide: { loaded: false, isEmpty: true },
      credo: { loaded: false, isEmpty: true },
      constraints: { loaded: false, isEmpty: true },
    },
    isLoading: false,
  });
  mockConfigGetStyleGuideRawUseQuery.mockReturnValue({
    data: { content: "" },
    isLoading: false,
    refetch: jest.fn(),
  });
  mockConfigGetCredoRawUseQuery.mockReturnValue({
    data: { content: "" },
    isLoading: false,
    refetch: jest.fn(),
  });
  mockConfigGetConstraintsRawUseQuery.mockReturnValue({
    data: { content: "" },
    isLoading: false,
    refetch: jest.fn(),
  });
  mockAIGetSettingsUseQuery.mockReturnValue({
    data: { provider: "gemini", model: "gemini-3-pro-preview", temperature: 0.7 },
    isLoading: false,
  });
  mockAIGetAvailableModelsUseQuery.mockReturnValue({
    data: { provider: "gemini", models: [] },
    isLoading: false,
  });
  
  // Reset mutations to default
  const defaultMutation = {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  };
  
  mockCapsuleCreateUseMutation.mockReturnValue(defaultMutation);
  mockCreateAnchorFromPDFUseMutation.mockReturnValue(defaultMutation);
  mockRegenerateRepurposedContentUseMutation.mockReturnValue(defaultMutation);
  mockUpdateAnchorUseMutation.mockReturnValue(defaultMutation);
  mockDeleteAnchorUseMutation.mockReturnValue(defaultMutation);
  mockUpdateRepurposedContentUseMutation.mockReturnValue(defaultMutation);
  mockDeleteRepurposedContentUseMutation.mockReturnValue(defaultMutation);
  mockConceptCreateUseMutation.mockReturnValue(defaultMutation);
  mockConceptGenerateCandidatesUseMutation.mockReturnValue({
    ...defaultMutation,
    mutateAsync: jest.fn(() => Promise.resolve([])),
  });
  mockConceptDeleteUseMutation.mockReturnValue(defaultMutation);
  mockConceptRestoreUseMutation.mockReturnValue(defaultMutation);
  mockConceptPurgeTrashUseMutation.mockReturnValue(defaultMutation);
  mockPDFExtractTextUseMutation.mockReturnValue({
    ...defaultMutation,
    mutateAsync: jest.fn(() => Promise.resolve({ text: "" })),
  });
  mockLinkCreateUseMutation.mockReturnValue(defaultMutation);
  mockLinkDeleteUseMutation.mockReturnValue(defaultMutation);
  mockLinkProposeUseMutation.mockReturnValue(defaultMutation);
  mockConfigUpdateUseMutation.mockReturnValue(defaultMutation);
  mockConfigUpdateStyleGuideUseMutation.mockReturnValue(defaultMutation);
  mockConfigUpdateCredoUseMutation.mockReturnValue(defaultMutation);
  mockConfigUpdateConstraintsUseMutation.mockReturnValue(defaultMutation);
  mockAIUpdateSettingsUseMutation.mockReturnValue(defaultMutation);
}

