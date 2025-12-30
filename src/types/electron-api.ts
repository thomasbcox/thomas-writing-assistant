/**
 * ElectronAPI Interface - Single Source of Truth
 * 
 * This file defines the complete API contract between:
 * 1. electron/preload.ts (implementation)
 * 2. src/lib/ipc-client.ts (consumer)
 * 3. src/test/utils/component-test-wrapper.tsx (mock)
 * 
 * Any change here MUST be reflected in all three locations.
 * TypeScript will enforce this at compile time.
 * 
 * IMPORTANT: IPC uses JSON serialization, which converts Date objects to ISO strings.
 * All "Serialized" types below represent the actual wire format that components receive.
 */

// =============================================================================
// Serialized Entity Types (what comes over the IPC wire after JSON serialization)
// Date fields become strings, everything else stays the same
// =============================================================================

export interface SerializedConcept {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  content: string;
  creator: string;
  source: string;
  year: string;
  status: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  trashedAt: string | null; // ISO date string or null
}

export interface SerializedLink {
  id: string;
  sourceId: string;
  targetId: string;
  linkNameId: string;
  notes: string | null;
  createdAt: string; // ISO date string
}

export interface SerializedLinkName {
  id: string;
  forwardName: string;
  reverseName: string;
  isSymmetric: boolean;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string; // ISO date string
}

export interface SerializedCapsule {
  id: string;
  title: string;
  promise: string;
  cta: string;
  offerMapping: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface SerializedAnchor {
  id: string;
  capsuleId: string;
  title: string;
  content: string;
  painPoints: string | null; // JSON array as string
  solutionSteps: string | null; // JSON array as string
  proof: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface SerializedRepurposedContent {
  id: string;
  anchorId: string;
  type: string;
  content: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// =============================================================================
// Input Types
// =============================================================================

export interface ConceptListInput {
  includeTrash?: boolean;
  search?: string;
}

export interface ConceptGetByIdInput {
  id: string;
}

export interface ConceptCreateInput {
  title: string;
  description?: string;
  content: string;
  creator: string;
  source?: string;
  year?: string;
}

export interface ConceptUpdateInput {
  id: string;
  title?: string;
  description?: string;
  content?: string;
  creator?: string;
  source?: string;
  year?: string;
}

export interface ConceptDeleteInput {
  id: string;
}

export interface ConceptRestoreInput {
  id: string;
}

export interface ConceptPurgeTrashInput {
  daysOld?: number;
}

export interface ConceptProposeLinksInput {
  conceptId: string;
  maxProposals?: number;
}

export interface ConceptGenerateCandidatesInput {
  text: string;
  instructions?: string;
  maxCandidates?: number;
  defaultCreator?: string;
  defaultYear?: string;
}

export interface CapsuleListInput {
  summary?: boolean;
}

export interface CapsuleGetByIdInput {
  id: string;
}

export interface CapsuleCreateInput {
  title: string;
  promise: string;
  cta: string;
  offerMapping?: string;
}

export interface CapsuleCreateAnchorFromPDFInput {
  capsuleId: string;
  fileData: string;
  fileName?: string;
  autoRepurpose?: boolean;
}

export interface LinkGetAllInput {
  summary?: boolean;
}

export interface LinkGetByConceptInput {
  conceptId: string;
}

export interface LinkCreateInput {
  sourceId: string;
  targetId: string;
  linkNameId: string;
  notes?: string;
}

export interface LinkDeleteInput {
  sourceId: string;
  targetId: string;
}

export interface LinkNameCreateInput {
  forwardName: string;
  reverseName?: string;
}

export interface LinkNameUpdateInput {
  id: string;
  forwardName: string;
  reverseName?: string;
}

export interface LinkNameDeleteInput {
  id: string;
  replaceWithId?: string;
}

export interface LinkNameGetUsageInput {
  id: string;
}

export interface ConfigUpdateInput {
  content: string;
}

export interface PdfExtractTextInput {
  fileData: string;
  fileName?: string;
}

export interface AIUpdateSettingsInput {
  provider?: "openai" | "gemini";
  model?: string;
  temperature?: number;
}

// =============================================================================
// Output Types (Serialized - what components actually receive)
// =============================================================================

export type ConceptListResult = SerializedConcept[];

export type ConceptResult = SerializedConcept | null;

export interface ConceptPurgeTrashResult {
  deletedCount: number;
}

export interface LinkProposal {
  source: string;
  target: string;
  target_title: string;
  forward_name: string;
  confidence: number;
  reasoning: string;
}

export type ConceptProposeLinksResult = LinkProposal[];

export interface ConceptCandidate {
  title: string;
  content: string;
  summary: string;
  description?: string;
  creator?: string;
  source?: string;
  year?: string;
}

export type ConceptGenerateCandidatesResult = ConceptCandidate[];

export type SerializedLinkWithRelations = SerializedLink & {
  source: SerializedConcept | null;
  target: SerializedConcept | null;
  linkName: SerializedLinkName | null;
};

export type LinkListResult = SerializedLinkWithRelations[];

export interface LinksByConceptResult {
  outgoing: SerializedLinkWithRelations[];
  incoming: SerializedLinkWithRelations[];
}

export type SerializedAnchorWithRepurposed = SerializedAnchor & {
  repurposedContent: SerializedRepurposedContent[];
};

export type SerializedCapsuleWithAnchors = SerializedCapsule & {
  anchors: SerializedAnchorWithRepurposed[];
};

export type CapsuleListResult = SerializedCapsuleWithAnchors[];

export type CapsuleResult = SerializedCapsuleWithAnchors | null;

export interface CapsuleCreateAnchorFromPDFResult {
  anchor: SerializedAnchor;
  repurposedContent: SerializedRepurposedContent[];
}

export type LinkNameListResult = SerializedLinkName[];

export type LinkNameResult = SerializedLinkName;

export interface LinkNameUsageResult {
  count: number;
}

// Config types - the parsed YAML structures
export interface StyleGuide {
  voice?: string;
  tone?: string;
  guidelines?: string[];
  [key: string]: unknown;
}

export interface Credo {
  values?: string[];
  principles?: string[];
  [key: string]: unknown;
}

export interface Constraints {
  rules?: string[];
  limits?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ConfigRawResult {
  content: string;
}

export interface ConfigUpdateResult {
  success: boolean;
}

export interface ConfigStatusResult {
  styleGuide: boolean;
  credo: boolean;
  constraints: boolean;
}

export interface PdfExtractResult {
  text: string;
  numPages: number;
}

export interface AISettings {
  provider: "openai" | "gemini";
  model: string;
  temperature: number;
  availableProviders: {
    openai: boolean;
    gemini: boolean;
  };
}

export interface AISettingsUpdateResult {
  provider: "openai" | "gemini";
  model: string;
  temperature: number;
}

export interface ModelOption {
  value: string;
  label: string;
}

export interface AIAvailableModelsResult {
  provider: "openai" | "gemini";
  models: ModelOption[];
}

// =============================================================================
// Main ElectronAPI Interface
// =============================================================================

export interface ElectronAPI {
  concept: {
    list: (input: ConceptListInput) => Promise<ConceptListResult>;
    getById: (input: ConceptGetByIdInput) => Promise<ConceptResult>;
    create: (input: ConceptCreateInput) => Promise<SerializedConcept>;
    update: (input: ConceptUpdateInput) => Promise<SerializedConcept>;
    delete: (input: ConceptDeleteInput) => Promise<SerializedConcept>;
    restore: (input: ConceptRestoreInput) => Promise<SerializedConcept>;
    purgeTrash: (input: ConceptPurgeTrashInput) => Promise<ConceptPurgeTrashResult>;
    proposeLinks: (input: ConceptProposeLinksInput) => Promise<ConceptProposeLinksResult>;
    generateCandidates: (input: ConceptGenerateCandidatesInput) => Promise<ConceptGenerateCandidatesResult>;
  };

  capsule: {
    list: (input?: CapsuleListInput) => Promise<CapsuleListResult>;
    getById: (input: CapsuleGetByIdInput) => Promise<CapsuleResult>;
    create: (input: CapsuleCreateInput) => Promise<SerializedCapsule>;
    createAnchorFromPDF: (input: CapsuleCreateAnchorFromPDFInput) => Promise<CapsuleCreateAnchorFromPDFResult>;
  };

  link: {
    getAll: (input?: LinkGetAllInput) => Promise<LinkListResult>;
    getByConcept: (input: LinkGetByConceptInput) => Promise<LinksByConceptResult>;
    create: (input: LinkCreateInput) => Promise<SerializedLinkWithRelations>;
    delete: (input: LinkDeleteInput) => Promise<SerializedLink | null>;
  };

  linkName: {
    getAll: () => Promise<LinkNameListResult>;
    create: (input: LinkNameCreateInput) => Promise<LinkNameResult>;
    update: (input: LinkNameUpdateInput) => Promise<LinkNameResult>;
    delete: (input: LinkNameDeleteInput) => Promise<LinkNameResult>;
    getUsage: (input: LinkNameGetUsageInput) => Promise<LinkNameUsageResult>;
  };

  config: {
    getStyleGuide: () => Promise<StyleGuide>;
    getCredo: () => Promise<Credo>;
    getConstraints: () => Promise<Constraints>;
    getStyleGuideRaw: () => Promise<ConfigRawResult>;
    getCredoRaw: () => Promise<ConfigRawResult>;
    getConstraintsRaw: () => Promise<ConfigRawResult>;
    updateStyleGuide: (input: ConfigUpdateInput) => Promise<ConfigUpdateResult>;
    updateCredo: (input: ConfigUpdateInput) => Promise<ConfigUpdateResult>;
    updateConstraints: (input: ConfigUpdateInput) => Promise<ConfigUpdateResult>;
    getStatus: () => Promise<ConfigStatusResult>;
  };

  pdf: {
    extractText: (input: PdfExtractTextInput) => Promise<PdfExtractResult>;
  };

  ai: {
    getSettings: () => Promise<AISettings>;
    updateSettings: (input: AIUpdateSettingsInput) => Promise<AISettingsUpdateResult>;
    getAvailableModels: () => Promise<AIAvailableModelsResult>;
  };

  ping: () => Promise<string>;
}

// =============================================================================
// Global Window Declaration
// =============================================================================

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
