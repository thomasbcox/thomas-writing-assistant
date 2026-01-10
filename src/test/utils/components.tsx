/**
 * Component test infrastructure
 * Provides mocks and utilities for testing React components that use IPC
 */

import React from "react";
import { jest } from "@jest/globals";
import type {
  ElectronAPI,
  SerializedConcept,
  SerializedCapsule,
  SerializedRepurposedContent,
  SerializedLinkWithRelations,
  SerializedLinkName,
  SerializedOffer,
  SerializedChatSession,
  SerializedChatMessage,
  SerializedChatSessionWithMessages,
  ConceptPurgeTrashResult,
  ConceptProposeLinksResult,
  ConceptGenerateCandidatesResult,
  CapsuleListResult,
  CapsuleResult,
  CapsuleCreateAnchorFromPDFResult,
  LinkListResult,
  LinksByConceptResult,
  LinkCountsByConceptResult,
  LinkNameListResult,
  LinkNameUsageResult,
  OfferListResult,
  OfferResult,
  OfferDeleteResult,
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
  EmbeddingStatusResult,
} from "~/types/electron-api";

// Helper to create ISO date strings for mock data
const mockDate = () => new Date().toISOString();

/**
 * Default mock data factories - ensures type safety
 */
const createMockConcept = (overrides?: Partial<SerializedConcept>): SerializedConcept => ({
  id: "mock-concept-id",
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

const createMockOffer = (overrides?: Partial<SerializedOffer>): SerializedOffer => ({
  id: "mock-offer-id",
  name: "Mock Offer",
  description: null,
  createdAt: mockDate(),
  updatedAt: mockDate(),
  ...overrides,
});

const createMockChatSession = (overrides?: Partial<SerializedChatSession>): SerializedChatSession => ({
  id: "mock-chat-session-id",
  conceptId: "mock-concept-id",
  title: null,
  createdAt: mockDate(),
  updatedAt: mockDate(),
  ...overrides,
});

const createMockChatMessage = (overrides?: Partial<SerializedChatMessage>): SerializedChatMessage => ({
  id: "mock-chat-message-id",
  sessionId: "mock-chat-session-id",
  role: "user",
  content: "Mock message",
  suggestions: null,
  actions: null,
  createdAt: mockDate(),
  ...overrides,
});

/**
 * Create a complete mock of the ElectronAPI interface
 * All methods are Jest mocks that can be configured per test
 */
export function createMockElectronAPI(): ElectronAPI {
  return {
    concept: {
      list: jest.fn<() => Promise<SerializedConcept[]>>().mockResolvedValue([]),
      getById: jest.fn<() => Promise<SerializedConcept | null>>().mockResolvedValue(null),
      create: jest.fn<() => Promise<SerializedConcept>>().mockResolvedValue(createMockConcept()),
      update: jest.fn<() => Promise<SerializedConcept>>().mockResolvedValue(createMockConcept()),
      delete: jest.fn<() => Promise<SerializedConcept>>().mockResolvedValue(createMockConcept()),
      restore: jest.fn<() => Promise<SerializedConcept>>().mockResolvedValue(createMockConcept()),
      purgeTrash: jest.fn<() => Promise<ConceptPurgeTrashResult>>().mockResolvedValue({ deletedCount: 0 }),
      proposeLinks: jest.fn<() => Promise<ConceptProposeLinksResult>>().mockResolvedValue([]),
      generateCandidates: jest.fn<() => Promise<ConceptGenerateCandidatesResult>>().mockResolvedValue([]),
    },

    capsule: {
      list: jest.fn<() => Promise<CapsuleListResult>>().mockResolvedValue([]),
      getById: jest.fn<() => Promise<CapsuleResult>>().mockResolvedValue(null),
      create: jest.fn<() => Promise<SerializedCapsule>>().mockResolvedValue(createMockCapsule()),
      createAnchorFromPDF: jest.fn<() => Promise<CapsuleCreateAnchorFromPDFResult>>().mockResolvedValue({
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
      regenerateRepurposedContent: jest.fn<() => Promise<SerializedRepurposedContent[]>>().mockResolvedValue([]),
    },

    offer: {
      list: jest.fn<() => Promise<OfferListResult>>().mockResolvedValue([]),
      getById: jest.fn<() => Promise<OfferResult>>().mockResolvedValue(null),
      create: jest.fn<() => Promise<SerializedOffer>>().mockResolvedValue(createMockOffer()),
      update: jest.fn<() => Promise<SerializedOffer>>().mockResolvedValue(createMockOffer()),
      delete: jest.fn<() => Promise<OfferDeleteResult>>().mockResolvedValue({ deleted: true, unassignedCapsules: 0 }),
      assignCapsule: jest.fn<() => Promise<SerializedCapsule>>().mockResolvedValue(createMockCapsule()),
      getUnassignedCapsules: jest.fn<() => Promise<SerializedCapsule[]>>().mockResolvedValue([]),
    },

    chat: {
      createSession: jest.fn<() => Promise<SerializedChatSession>>().mockResolvedValue(createMockChatSession()),
      getSessionsByConceptId: jest.fn<() => Promise<SerializedChatSessionWithMessages[]>>().mockResolvedValue([]),
      getSessionById: jest.fn<() => Promise<SerializedChatSessionWithMessages>>().mockResolvedValue({
        ...createMockChatSession(),
        messages: [],
      }),
      deleteSession: jest.fn<() => Promise<{ deleted: boolean }>>().mockResolvedValue({ deleted: true }),
      addMessage: jest.fn<() => Promise<SerializedChatMessage>>().mockResolvedValue(createMockChatMessage()),
      getOrCreateSession: jest.fn<() => Promise<SerializedChatSessionWithMessages>>().mockResolvedValue({
        ...createMockChatSession(),
        messages: [],
      }),
    },

    link: {
      getAll: jest.fn<() => Promise<LinkListResult>>().mockResolvedValue([]),
      getByConcept: jest.fn<() => Promise<LinksByConceptResult>>().mockResolvedValue({ outgoing: [], incoming: [] }),
      getCountsByConcept: jest.fn<() => Promise<LinkCountsByConceptResult>>().mockResolvedValue([]),
      create: jest.fn<() => Promise<SerializedLinkWithRelations>>().mockResolvedValue(createMockLinkWithRelations()),
      update: jest.fn<() => Promise<SerializedLinkWithRelations>>().mockResolvedValue(createMockLinkWithRelations()),
      delete: jest.fn<() => Promise<SerializedLinkWithRelations | null>>().mockResolvedValue(null),
    },

    linkName: {
      getAll: jest.fn<() => Promise<LinkNameListResult>>().mockResolvedValue([]),
      create: jest.fn<() => Promise<SerializedLinkName>>().mockResolvedValue(createMockLinkName()),
      update: jest.fn<() => Promise<SerializedLinkName>>().mockResolvedValue(createMockLinkName({ forwardName: "updated forward" })),
      delete: jest.fn<() => Promise<SerializedLinkName>>().mockResolvedValue(createMockLinkName({ isDeleted: true })),
      getUsage: jest.fn<() => Promise<LinkNameUsageResult>>().mockResolvedValue({ count: 0 }),
    },

    config: {
      getStyleGuide: jest.fn<() => Promise<StyleGuide>>().mockResolvedValue({ voice: "professional", tone: "friendly" }),
      getCredo: jest.fn<() => Promise<Credo>>().mockResolvedValue({ values: ["quality", "clarity"] }),
      getConstraints: jest.fn<() => Promise<Constraints>>().mockResolvedValue({ rules: ["no jargon"] }),
      getStyleGuideRaw: jest.fn<() => Promise<ConfigRawResult>>().mockResolvedValue({ content: "voice: professional\ntone: friendly" }),
      getCredoRaw: jest.fn<() => Promise<ConfigRawResult>>().mockResolvedValue({ content: "values:\n  - quality\n  - clarity" }),
      getConstraintsRaw: jest.fn<() => Promise<ConfigRawResult>>().mockResolvedValue({ content: "rules:\n  - no jargon" }),
      updateStyleGuide: jest.fn<() => Promise<ConfigUpdateResult>>().mockResolvedValue({ success: true }),
      updateCredo: jest.fn<() => Promise<ConfigUpdateResult>>().mockResolvedValue({ success: true }),
      updateConstraints: jest.fn<() => Promise<ConfigUpdateResult>>().mockResolvedValue({ success: true }),
      getStatus: jest.fn<() => Promise<ConfigStatusResult>>().mockResolvedValue({ styleGuide: true, credo: true, constraints: true }),
    },

    pdf: {
      extractText: jest.fn<() => Promise<PdfExtractResult>>().mockResolvedValue({ text: "Extracted text content", numPages: 1 }),
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
      updateSettings: jest.fn<() => Promise<AISettingsUpdateResult>>().mockResolvedValue({
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
      getEmbeddingStatus: jest.fn<() => Promise<EmbeddingStatusResult>>().mockResolvedValue({
        totalConcepts: 0,
        conceptsWithEmbeddings: 0,
        conceptsWithoutEmbeddings: 0,
        isIndexing: false,
        lastIndexedAt: null,
      }),
      generateMissingEmbeddings: jest.fn<() => Promise<EmbeddingStatusResult>>().mockResolvedValue({
        totalConcepts: 0,
        conceptsWithEmbeddings: 0,
        conceptsWithoutEmbeddings: 0,
        isIndexing: false,
        lastIndexedAt: null,
      }),
      retryFailedEmbeddings: jest.fn<() => Promise<EmbeddingStatusResult>>().mockResolvedValue({
        totalConcepts: 0,
        conceptsWithEmbeddings: 0,
        conceptsWithoutEmbeddings: 0,
        isIndexing: false,
        lastIndexedAt: null,
      }),
    },

    enrichment: {
      analyze: jest.fn<() => Promise<any>>().mockResolvedValue({
        suggestions: [],
        quickActions: [],
        initialMessage: "Hello! I can help you enrich this concept.",
      }),
      enrichMetadata: jest.fn<() => Promise<any>>().mockResolvedValue({
        creator: "Mock Creator",
        year: "2025",
        source: "Mock Source",
        confidence: "high" as const,
      }),
      chat: jest.fn<() => Promise<any>>().mockResolvedValue({
        response: "Mock chat response",
        suggestions: [],
        actions: [],
      }),
      expandDefinition: jest.fn<() => Promise<any>>().mockResolvedValue({
        expandedDefinition: "Mock expanded definition",
      }),
    },

    ping: jest.fn<() => Promise<string>>().mockResolvedValue("pong"),
  };
}

// Global mock instance
let mockElectronAPI: ElectronAPI | null = null;

/**
 * Get or create the mock ElectronAPI instance
 * Use this to access the mock for assertions
 */
export function getMockElectronAPI(): ElectronAPI {
  if (!mockElectronAPI) {
    mockElectronAPI = createMockElectronAPI();
  }
  return mockElectronAPI;
}

/**
 * Reset all mock functions to their initial state
 * Call this in beforeEach() to ensure test isolation
 */
export function resetMockElectronAPI(): void {
  mockElectronAPI = createMockElectronAPI();
  
  // Setup window.electronAPI before components are imported
  if (typeof window !== "undefined") {
    (window as any).electronAPI = mockElectronAPI;
  } else {
    (global as any).window = { electronAPI: mockElectronAPI };
  }
}

/**
 * Wrapper component for tests - provides React context if needed
 * Sets up window.electronAPI with the mock
 */
export function ComponentTestWrapper({ children }: { children: React.ReactNode }) {
  // Ensure window.electronAPI is set
  if (typeof window !== "undefined") {
    (window as any).electronAPI = getMockElectronAPI();
  } else {
    (global as any).window = { electronAPI: getMockElectronAPI() };
  }

  return <>{children}</>;
}

// Initialize mock on module load
resetMockElectronAPI();

// Export mock data factories for use in tests
export {
  createMockConcept,
  createMockCapsule,
  createMockLinkName,
  createMockLinkWithRelations,
  createMockOffer,
  createMockChatSession,
  createMockChatMessage,
};

