/**
 * Test wrapper for components using IPC hooks
 * Mocks window.electronAPI for component tests
 * 
 * IMPORTANT: The mockElectronAPI object structure must match ElectronAPI.
 * If the interface changes, TypeScript will fail compilation here,
 * ensuring mocks stay in sync with the real API.
 */

import React from "react";
import { jest } from "@jest/globals";
import type {
  ElectronAPI,
  SerializedConcept,
  SerializedCapsule,
  SerializedLinkWithRelations,
  SerializedLinkName,
  ConceptPurgeTrashResult,
  ConceptProposeLinksResult,
  ConceptGenerateCandidatesResult,
  CapsuleListResult,
  CapsuleResult,
  CapsuleCreateAnchorFromPDFResult,
  LinkListResult,
  LinksByConceptResult,
  LinkNameListResult,
  LinkNameUsageResult,
  StyleGuide,
  Credo,
  Constraints,
  ConfigRawResult,
  ConfigUpdateResult,
  ConfigStatusResult,
  PdfExtractResult,
  AISettings,
  AISettingsUpdateResult,
  AIAvailableModelsResult,
} from "~/types/electron-api";

// Helper to create ISO date strings for mock data
const mockDate = () => new Date().toISOString();

/**
 * Default mock data factories - ensures type safety
 */
const createMockConcept = (overrides?: Partial<SerializedConcept>): SerializedConcept => ({
  id: "mock-id",
  identifier: "mock-identifier",
  title: "Mock Concept",
  description: null,
  content: "Mock content",
  creator: "Mock Creator",
  source: "Unknown",
  year: "2025",
  status: "active",
  createdAt: mockDate(),
  updatedAt: mockDate(),
  trashedAt: null,
  ...overrides,
});

const createMockCapsule = (overrides?: Partial<SerializedCapsule>): SerializedCapsule => ({
  id: "mock-capsule-id",
  title: "Mock Capsule",
  promise: "Mock promise",
  cta: "Mock CTA",
  offerId: null,
  offerMapping: null,
  createdAt: mockDate(),
  updatedAt: mockDate(),
  ...overrides,
});

const createMockLinkName = (overrides?: Partial<SerializedLinkName>): SerializedLinkName => ({
  id: "mock-link-name-id",
  forwardName: "relates to",
  reverseName: "is related to",
  isSymmetric: false,
  isDefault: false,
  isDeleted: false,
  createdAt: mockDate(),
  ...overrides,
});

const createMockLinkWithRelations = (overrides?: Partial<SerializedLinkWithRelations>): SerializedLinkWithRelations => ({
  id: "mock-link-id",
  sourceId: "source-id",
  targetId: "target-id",
  linkNameId: "link-name-id",
  notes: null,
  createdAt: mockDate(),
  source: null,
  target: null,
  linkName: null,
  ...overrides,
});

/**
 * Mock implementation of ElectronAPI
 * 
 * Each method returns a sensible default value that matches the expected return type.
 * Tests can override these with mockResolvedValue/mockRejectedValue as needed.
 * 
 * NOTE: All date fields are ISO strings (not Date objects) because IPC uses JSON serialization.
 */
const mockElectronAPI = {
  concept: {
    list: jest.fn<(input: any) => Promise<SerializedConcept[]>>().mockResolvedValue([]),
    getById: jest.fn<(input: any) => Promise<SerializedConcept | null>>().mockResolvedValue(null),
    create: jest.fn<(input: any) => Promise<SerializedConcept>>().mockResolvedValue(createMockConcept()),
    update: jest.fn<(input: any) => Promise<SerializedConcept>>().mockResolvedValue(createMockConcept({ title: "Updated Concept" })),
    delete: jest.fn<(input: any) => Promise<SerializedConcept>>().mockResolvedValue(createMockConcept({ status: "trash", trashedAt: mockDate() })),
    restore: jest.fn<(input: any) => Promise<SerializedConcept>>().mockResolvedValue(createMockConcept({ title: "Restored Concept" })),
    purgeTrash: jest.fn<(input: any) => Promise<ConceptPurgeTrashResult>>().mockResolvedValue({ deletedCount: 0 }),
    proposeLinks: jest.fn<(input: any) => Promise<ConceptProposeLinksResult>>().mockResolvedValue([]),
    generateCandidates: jest.fn<(input: any) => Promise<ConceptGenerateCandidatesResult>>().mockResolvedValue([]),
  },

  capsule: {
    list: jest.fn<(input?: any) => Promise<CapsuleListResult>>().mockResolvedValue([]),
    getById: jest.fn<(input: any) => Promise<CapsuleResult>>().mockResolvedValue(null),
    create: jest.fn<(input: any) => Promise<SerializedCapsule>>().mockResolvedValue(createMockCapsule()),
    createAnchorFromPDF: jest.fn<(input: any) => Promise<CapsuleCreateAnchorFromPDFResult>>().mockResolvedValue({
      anchor: {
        id: "mock-anchor-id",
        capsuleId: "mock-capsule-id",
        title: "Mock Anchor",
        content: "Mock content",
        painPoints: null,
        solutionSteps: null,
        proof: null,
        createdAt: mockDate(),
        updatedAt: mockDate(),
      },
      repurposedContent: [],
    }),
  },

  link: {
    getAll: jest.fn<(input?: any) => Promise<LinkListResult>>().mockResolvedValue([]),
    getByConcept: jest.fn<(input: any) => Promise<LinksByConceptResult>>().mockResolvedValue({ outgoing: [], incoming: [] }),
    create: jest.fn<(input: any) => Promise<SerializedLinkWithRelations>>().mockResolvedValue(createMockLinkWithRelations()),
    delete: jest.fn<(input: any) => Promise<SerializedLinkWithRelations | null>>().mockResolvedValue(null),
  },

  linkName: {
    getAll: jest.fn<() => Promise<LinkNameListResult>>().mockResolvedValue([]),
    create: jest.fn<(input: any) => Promise<SerializedLinkName>>().mockResolvedValue(createMockLinkName()),
    update: jest.fn<(input: any) => Promise<SerializedLinkName>>().mockResolvedValue(createMockLinkName({ forwardName: "updated forward" })),
    delete: jest.fn<(input: any) => Promise<SerializedLinkName>>().mockResolvedValue(createMockLinkName({ isDeleted: true })),
    getUsage: jest.fn<(input: any) => Promise<LinkNameUsageResult>>().mockResolvedValue({ count: 0 }),
  },

  config: {
    getStyleGuide: jest.fn<() => Promise<StyleGuide>>().mockResolvedValue({ voice: "professional", tone: "friendly" }),
    getCredo: jest.fn<() => Promise<Credo>>().mockResolvedValue({ values: ["quality", "clarity"] }),
    getConstraints: jest.fn<() => Promise<Constraints>>().mockResolvedValue({ rules: ["no jargon"] }),
    getStyleGuideRaw: jest.fn<() => Promise<ConfigRawResult>>().mockResolvedValue({ content: "voice: professional\ntone: friendly" }),
    getCredoRaw: jest.fn<() => Promise<ConfigRawResult>>().mockResolvedValue({ content: "values:\n  - quality\n  - clarity" }),
    getConstraintsRaw: jest.fn<() => Promise<ConfigRawResult>>().mockResolvedValue({ content: "rules:\n  - no jargon" }),
    updateStyleGuide: jest.fn<(input: any) => Promise<ConfigUpdateResult>>().mockResolvedValue({ success: true }),
    updateCredo: jest.fn<(input: any) => Promise<ConfigUpdateResult>>().mockResolvedValue({ success: true }),
    updateConstraints: jest.fn<(input: any) => Promise<ConfigUpdateResult>>().mockResolvedValue({ success: true }),
    getStatus: jest.fn<() => Promise<ConfigStatusResult>>().mockResolvedValue({ styleGuide: true, credo: true, constraints: true }),
  },

  pdf: {
    extractText: jest.fn<(input: any) => Promise<PdfExtractResult>>().mockResolvedValue({ text: "Extracted text content", numPages: 1 }),
  },

  ai: {
    getSettings: jest.fn<() => Promise<AISettings>>().mockResolvedValue({
      provider: "openai" as const,
      model: "gpt-4o-mini",
      temperature: 0.7,
      availableProviders: {
        openai: true,
        gemini: false,
      },
    }),
    updateSettings: jest.fn<(input: any) => Promise<AISettingsUpdateResult>>().mockResolvedValue({
      provider: "openai" as const,
      model: "gpt-4o-mini",
      temperature: 0.7,
    }),
    getAvailableModels: jest.fn<() => Promise<AIAvailableModelsResult>>().mockResolvedValue({
      provider: "openai" as const,
      models: [
        { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Cheap)" },
        { value: "gpt-4o", label: "GPT-4o (Balanced)" },
      ],
    }),
  },

  ping: jest.fn<() => Promise<string>>().mockResolvedValue("pong"),
};

// Type assertion to ensure mock matches ElectronAPI structure
// This will fail at compile time if the mock structure doesn't match
const _typeCheck: ElectronAPI = mockElectronAPI as unknown as ElectronAPI;

// Setup window.electronAPI before components are imported
if (typeof window !== "undefined") {
  (window as any).electronAPI = mockElectronAPI;
} else {
  (global as any).window = { electronAPI: mockElectronAPI };
}

/**
 * Wrapper component for tests - provides React context if needed
 */
export function ComponentTestWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Get the mock electronAPI object for test assertions
 */
export function getMockElectronAPI() {
  return mockElectronAPI;
}

/**
 * Reset all mock functions to their initial state
 * Call this in beforeEach() to ensure test isolation
 */
export function resetMockElectronAPI() {
  // Reset all mock functions
  Object.values(mockElectronAPI).forEach((namespace) => {
    if (typeof namespace === "object" && namespace !== null) {
      Object.values(namespace).forEach((method) => {
        if (jest.isMockFunction(method)) {
          method.mockClear();
        }
      });
    }
  });
}

// Export mock data factories for use in tests
export {
  createMockConcept,
  createMockCapsule,
  createMockLinkName,
  createMockLinkWithRelations,
};
