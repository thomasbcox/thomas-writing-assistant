/**
 * Test data factories for creating mock objects
 */

export function createMockCapsule(overrides = {}) {
  return {
    id: `capsule-${Math.random().toString(36).substring(7)}`,
    title: "Test Capsule",
    promise: "This will help you achieve X",
    cta: "Get started now",
    offerMapping: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    anchors: [],
    ...overrides,
  };
}

export function createMockAnchor(overrides = {}) {
  return {
    id: `anchor-${Math.random().toString(36).substring(7)}`,
    capsuleId: "capsule-1",
    title: "Test Anchor",
    content: "Anchor content here",
    painPoints: JSON.stringify(["Pain 1", "Pain 2"]),
    solutionSteps: JSON.stringify(["Step 1", "Step 2"]),
    proof: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    repurposedContent: [],
    ...overrides,
  };
}

export function createMockRepurposedContent(overrides = {}) {
  return {
    id: `repurposed-${Math.random().toString(36).substring(7)}`,
    anchorId: "anchor-1",
    type: "social_post",
    content: "Social media post content",
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockConcept(overrides = {}) {
  return {
    id: `concept-${Math.random().toString(36).substring(7)}`,
    identifier: `test-concept-${Math.random().toString(36).substring(7)}`,
    title: "Test Concept",
    description: "Test description",
    content: "Test content",
    creator: "Test Creator",
    source: "Test Source",
    year: "2024",
    status: "active" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    trashedAt: null,
    ...overrides,
  };
}

export function createMockLinkName(overrides = {}) {
  return {
    id: `linkname-${Math.random().toString(36).substring(7)}`,
    forwardName: "references",
    reverseName: "referenced by",
    isSymmetric: false,
    isDefault: false,
    isDeleted: false,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockLink(overrides = {}) {
  const linkName = createMockLinkName();
  return {
    id: `link-${Math.random().toString(36).substring(7)}`,
    sourceId: "concept-1",
    targetId: "concept-2",
    linkNameId: linkName.id,
    notes: null,
    createdAt: new Date(),
    source: createMockConcept({ id: "concept-1" }),
    target: createMockConcept({ id: "concept-2" }),
    linkName: linkName,
    ...overrides,
  };
}

