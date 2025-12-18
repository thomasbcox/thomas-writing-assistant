# Untested and Potentially Broken Functions Analysis

**Date**: 2025-12-15  
**Test Status**: 114 tests passing (99.1% pass rate)

## Executive Summary

### ✅ Well Tested
- **Service Layer**: All major services tested (conceptProposer, conceptEnricher, linkProposer, repurposer, anchorExtractor, config)
- **Core API Routes**: Concepts, links, capsules (basic), config, enrichment
- **Core React Query Hooks**: Concepts, links, capsules (basic), config

### ❌ Missing Tests
- **API Routes**: 20+ endpoints untested
- **React Query Hooks**: 20+ hooks untested
- **Components**: Most UI components untested

### ⚠️ Potentially Broken
- **Missing API Routes**: PUT/DELETE for capsules/[id] (hooks reference them but routes don't exist)
- **Missing Hooks**: useUpdateCapsule, useDeleteCapsule (referenced in tests but not exported)

---

## API Routes: Implemented vs Tested

### ✅ Tested API Routes (6 files)

1. **`/api/concepts`** ✅
   - GET ✅ (tested)
   - POST ✅ (tested)

2. **`/api/concepts/[id]`** ✅
   - GET ✅ (tested)
   - PUT ✅ (tested)
   - DELETE ✅ (tested)

3. **`/api/links`** ✅
   - GET ✅ (tested)
   - POST ✅ (tested)

4. **`/api/links/[sourceId]/[targetId]`** ✅
   - DELETE ✅ (tested)

5. **`/api/capsules`** ✅
   - GET ✅ (tested)
   - POST ✅ (tested)

6. **`/api/capsules/[id]`** ✅
   - GET ✅ (tested)
   - ❌ **PUT** - **NOT IMPLEMENTED** (route doesn't exist)
   - ❌ **DELETE** - **NOT IMPLEMENTED** (route doesn't exist)

7. **`/api/config/status`** ✅
   - GET ✅ (tested)

8. **`/api/config/style-guide`** ✅
   - GET ✅ (tested)
   - PUT ✅ (tested)

9. **`/api/config/credo`** ✅
   - GET ✅ (tested)
   - PUT ✅ (tested)

10. **`/api/config/constraints`** ✅
    - GET ✅ (tested)
    - PUT ✅ (tested)

11. **`/api/enrichment/analyze`** ✅
    - POST ✅ (tested)

12. **`/api/enrichment/enrich-metadata`** ✅
    - POST ✅ (tested)

13. **`/api/enrichment/expand-definition`** ✅
    - POST ✅ (tested)

14. **`/api/enrichment/chat`** ✅
    - POST ✅ (tested)

### ❌ Untested API Routes (20+ endpoints)

#### Concepts Endpoints
1. **`/api/concepts/generate-candidates`** ❌
   - POST - Generate concept candidates from text
   - **Status**: Implemented, not tested

2. **`/api/concepts/[id]/propose-links`** ❌
   - GET - Propose links for a concept
   - **Status**: Implemented, not tested

3. **`/api/concepts/[id]/restore`** ❌
   - POST - Restore concept from trash
   - **Status**: Implemented, not tested

4. **`/api/concepts/purge-trash`** ❌
   - POST - Permanently delete old trashed concepts
   - **Status**: Implemented, not tested

#### Capsules Endpoints
5. **`/api/capsules/[id]/anchors`** ❌
   - POST - Create anchor
   - **Status**: Implemented, not tested

6. **`/api/capsules/[id]/anchors/[anchorId]`** ❌
   - PUT - Update anchor
   - DELETE - Delete anchor
   - **Status**: Implemented, not tested

7. **`/api/capsules/[id]/anchors/from-pdf`** ❌
   - POST - Create anchor from PDF
   - **Status**: Implemented, not tested

8. **`/api/capsules/[id]/anchors/[anchorId]/repurposed`** ❌
   - POST - Create repurposed content
   - **Status**: Implemented, not tested

9. **`/api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId]`** ❌
   - PUT - Update repurposed content
   - DELETE - Delete repurposed content
   - **Status**: Implemented, not tested

10. **`/api/capsules/[id]/anchors/[anchorId]/repurposed/regenerate-all`** ❌
    - POST - Regenerate all repurposed content
    - **Status**: Implemented, not tested

#### Link Names Endpoints
11. **`/api/link-names`** ❌
    - GET - List all link names
    - POST - Create link name
    - **Status**: Implemented, not tested

12. **`/api/link-names/[name]`** ❌
    - GET - Get link name usage
    - PUT - Update/rename link name
    - DELETE - Delete link name
    - **Status**: Implemented, not tested

#### PDF Endpoints
13. **`/api/pdf/extract-text`** ❌
    - POST - Extract text from PDF
    - **Status**: Implemented, not tested

#### AI Endpoints
14. **`/api/ai/settings`** ❌
    - GET - Get AI settings
    - PUT - Update AI settings
    - **Status**: Implemented, not tested

15. **`/api/ai/models`** ❌
    - GET - Get available models
    - **Status**: Implemented, not tested

#### Legacy
16. **`/api/trpc/[trpc]`** ⚠️
    - Legacy tRPC endpoint (may be unused)
    - **Status**: Unknown if still needed

---

## React Query Hooks: Implemented vs Tested

### ✅ Tested Hooks (4 files)

**`src/lib/api/concepts.ts`** - Partially tested
- ✅ `useConceptList` - Tested
- ✅ `useConcept` - Tested
- ✅ `useCreateConcept` - Tested
- ✅ `useUpdateConcept` - Tested
- ❌ `useDeleteConcept` - **Not tested**
- ❌ `useRestoreConcept` - **Not tested**
- ❌ `usePurgeTrash` - **Not tested**
- ❌ `useProposeLinks` - **Not tested**
- ❌ `useGenerateCandidates` - **Not tested**

**`src/lib/api/links.ts`** - Fully tested
- ✅ `useLinks` - Tested
- ✅ `useLinksByConcept` - Tested
- ✅ `useCreateLink` - Tested
- ✅ `useDeleteLink` - Tested

**`src/lib/api/capsules.ts`** - Partially tested
- ✅ `useCapsuleList` - Tested
- ✅ `useCapsule` - Tested
- ✅ `useCreateCapsule` - Tested
- ❌ `useCreateAnchor` - **Not tested**
- ❌ `useUpdateAnchor` - **Not tested**
- ❌ `useDeleteAnchor` - **Not tested**
- ❌ `useCreateAnchorFromPDF` - **Not tested**
- ❌ `useCreateRepurposedContent` - **Not tested**
- ❌ `useUpdateRepurposedContent` - **Not tested**
- ❌ `useDeleteRepurposedContent` - **Not tested**
- ❌ `useRegenerateRepurposedContent` - **Not tested**
- ❌ `useUpdateCapsule` - **NOT EXPORTED** (doesn't exist)
- ❌ `useDeleteCapsule` - **NOT EXPORTED** (doesn't exist)

**`src/lib/api/config.ts`** - Fully tested
- ✅ `useConfigStatus` - Tested
- ✅ `useStyleGuide` - Tested
- ✅ `useStyleGuideRaw` - Tested
- ✅ `useUpdateStyleGuide` - Tested
- ✅ `useCredo` - Tested
- ✅ `useCredoRaw` - Tested
- ✅ `useUpdateCredo` - Tested
- ✅ `useConstraints` - Tested
- ✅ `useConstraintsRaw` - Tested
- ✅ `useUpdateConstraints` - Tested

### ❌ Completely Untested Hooks (3 files)

**`src/lib/api/enrichment.ts`** - ❌ **NO TESTS**
- ❌ `useAnalyzeConcept` - Not tested
- ❌ `useEnrichMetadata` - Not tested
- ❌ `useChatEnrich` - Not tested
- ❌ `useExpandDefinition` - Not tested

**`src/lib/api/link-names.ts`** - ❌ **NO TESTS**
- ❌ `useLinkNames` - Not tested
- ❌ `useCreateLinkName` - Not tested
- ❌ `useUpdateLinkName` - Not tested
- ❌ `useDeleteLinkName` - Not tested
- ❌ `useLinkNameUsage` - Not tested

**`src/lib/api/pdf.ts`** - ❌ **NO TESTS**
- ❌ `useExtractPDFText` - Not tested

**`src/lib/api/ai.ts`** - ❌ **NO TESTS**
- ❌ `useAISettings` - Not tested
- ❌ `useUpdateAISettings` - Not tested
- ❌ `useAvailableModels` - Not tested

---

## Service Functions: Implemented vs Tested

### ✅ Tested Services

1. **`conceptProposer.ts`** ✅
   - ✅ `generateConceptCandidates` - Tested

2. **`conceptEnricher.ts`** ✅
   - ✅ `analyzeConcept` - Tested
   - ✅ `enrichMetadata` - Tested
   - ✅ `chatEnrichConcept` - Tested
   - ✅ `expandDefinition` - Tested

3. **`linkProposer.ts`** ✅
   - ✅ `proposeLinksForConcept` - Tested

4. **`repurposer.ts`** ✅
   - ✅ `repurposeAnchorContent` - Tested

5. **`anchorExtractor.ts`** ✅
   - ✅ `extractAnchorMetadata` - Tested

6. **`config.ts`** ✅
   - ✅ `getConfigLoader` - Tested
   - ✅ All config loader methods - Tested

### ⚠️ Partially Tested Services

**`llm/client.ts`** - ⚠️ **Indirectly tested**
- ✅ `getLLMClient` - Used in service tests
- ✅ `resetLLMClient` - Used in service tests
- ⚠️ LLM provider implementations - Tested via service mocks, not directly

---

## Missing Functionality (Potentially Broken)

### 🔴 Critical: Missing API Routes

1. **PUT `/api/capsules/[id]`** - ❌ **DOES NOT EXIST** (Intentional)
   - **Impact**: Cannot update capsules via API
   - **Evidence**: Route file only exports GET
   - **Hooks**: No hook exists (correctly, since route doesn't exist)
   - **UI Usage**: Capsules are not updated in UI (only anchors and repurposed content are modified)
   - **Status**: ✅ **Intentional design** - Capsules are immutable containers

2. **DELETE `/api/capsules/[id]`** - ❌ **DOES NOT EXIST** (Intentional)
   - **Impact**: Cannot delete capsules via API
   - **Evidence**: Route file only exports GET
   - **Hooks**: No hook exists (correctly, since route doesn't exist)
   - **UI Usage**: Capsules are not deleted in UI
   - **Status**: ✅ **Intentional design** - Capsules are permanent containers

### ⚠️ Missing Hooks (Referenced but Not Exported)

1. **`useUpdateCapsule`** - ❌ **NOT EXPORTED**
   - **Evidence**: Test file comments: "useUpdateCapsule and useDeleteCapsule are not exported"
   - **Status**: Intentionally not implemented (routes don't exist)

2. **`useDeleteCapsule`** - ❌ **NOT EXPORTED**
   - **Evidence**: Test file comments: "useUpdateCapsule and useDeleteCapsule are not exported"
   - **Status**: Intentionally not implemented (routes don't exist)

---

## Component Testing Status

### ✅ Tested Components (3 files)

1. **`LoadingSpinner`** ✅ - 3 tests
2. **`EmptyState`** ✅ - 3 tests
3. **`ConceptList`** ✅ - 2 tests (basic states only)

### ❌ Untested Components (20+ components)

**Major Components:**
- `ConceptEditor` - Concept editing UI
- `ConceptViewer` - Concept display
- `ConceptCreateForm` - Concept creation form
- `ConceptCandidateList` - Candidate selection
- `ConceptEnrichmentStudio` - Enrichment interface
- `LinksTab` - Links management
- `LinkProposer` - Link proposal UI
- `LinkNameManager` - Link name management
- `CapsulesTab` - Capsules management
- `CapsuleCard` - Capsule display
- `CapsuleList` - Capsule listing
- `CreateCapsuleForm` - Capsule creation
- `AnchorCard` - Anchor display
- `AnchorEditor` - Anchor editing
- `DerivativeList` - Repurposed content list
- `PDFUploader` - PDF upload UI
- `PDFUploadSection` - PDF upload section
- `TextInputTab` - Text input interface
- `ConfigTab` - Configuration UI
- `SettingsTab` - AI settings UI
- `Dashboard` - Main dashboard
- `ErrorBoundary` - Error handling

**Sub-components:**
- All components in `enrichment/` directory
- All components in `capsules/` directory
- All components in `ui/` directory

---

## Test Coverage Summary

### By Category

| Category | Implemented | Tested | Coverage |
|----------|-------------|--------|----------|
| **API Routes** | ~30 endpoints | 14 endpoints | ~47% |
| **React Query Hooks** | ~30 hooks | 14 hooks | ~47% |
| **Service Functions** | 7 services | 6 services | ~86% |
| **Components** | ~25 components | 3 components | ~12% |

### By Priority

#### 🔴 High Priority (Core Functionality)
- Missing PUT/DELETE for capsules (if needed)
- Untested concept operations (restore, purge-trash, generate-candidates, propose-links)
- Untested capsule anchor operations
- Untested repurposed content operations

#### 🟡 Medium Priority (Feature Completeness)
- Untested link-names endpoints
- Untested PDF extraction
- Untested AI settings
- Untested enrichment hooks

#### 🟢 Low Priority (Nice to Have)
- Component tests (UI testing)
- Integration tests
- E2E tests

---

## Recommendations

### Immediate Actions

1. **Add Missing API Route Tests** (Priority: High)
   - Test all capsule anchor endpoints
   - Test all repurposed content endpoints
   - Test concept utility endpoints (restore, purge-trash, generate-candidates, propose-links)
   - Test link-names endpoints
   - Test PDF and AI endpoints

2. **Add Missing Hook Tests** (Priority: High)
   - Test all untested hooks in concepts.ts
   - Test all hooks in capsules.ts
   - Test enrichment hooks
   - Test link-names hooks
   - Test PDF and AI hooks

3. **Decide on Capsule Update/Delete** (Priority: Medium)
   - Either implement PUT/DELETE routes for capsules
   - Or document that capsules are immutable (can only create, not update/delete)

4. **Add Component Tests** (Priority: Low)
   - Start with high-traffic components (ConceptEditor, CapsulesTab)
   - Add integration tests for user flows

### Testing Strategy

1. **API Route Tests**: Use `vi.hoisted()` pattern (already established)
2. **Hook Tests**: Use MSW or fetch mocks (pattern already established)
3. **Component Tests**: Add gradually, focus on critical user flows first

---

## Functions That May Not Work

### Potentially Broken (Need Verification)

1. **PDF Extraction** - Complex PDF parsing logic, no tests
   - Route: `/api/pdf/extract-text`
   - Service: Uses pdf-parse with custom wrapper
   - **Risk**: Medium - Complex parsing logic, no validation

2. **Anchor from PDF** - Complex multi-step process, no tests
   - Route: `/api/capsules/[id]/anchors/from-pdf`
   - Process: PDF → Text → Metadata → Anchor → Repurpose
   - **Risk**: Medium - Many steps, no validation

3. **Repurposed Content Regeneration** - Complex logic, no tests
   - Route: `/api/capsules/[id]/anchors/[anchorId]/repurposed/regenerate-all`
   - Process: Delete existing → Generate new → Save
   - **Risk**: Medium - Data mutation, no validation

4. **Link Name Updates** - Complex link replacement logic, no tests
   - Route: `/api/link-names/[name]` PUT
   - Process: Find all links → Update names → Update link name record
   - **Risk**: Medium - Data consistency critical, no validation

### Likely Working (But Untested)

- Most service functions (tested via service tests)
- Basic CRUD operations (tested via API route tests)
- Core hooks (tested via hook tests)

---

## Summary Statistics

- **Total API Routes**: ~30
- **Tested API Routes**: 14 (47%)
- **Total React Query Hooks**: ~30
- **Tested Hooks**: 14 (47%)
- **Total Service Functions**: ~10
- **Tested Services**: 6 (60%+)
- **Total Components**: ~25
- **Tested Components**: 3 (12%)

**Overall Test Coverage**: ~40-45% of functionality

---

*Last Updated: After comprehensive codebase analysis*
