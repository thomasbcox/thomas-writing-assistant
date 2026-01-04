# Code Coverage Improvement Plan

**Generated:** January 4, 2026  
**Current Coverage:** 38.03% statements, 30.59% branches, 26.98% functions, 38.15% lines  
**Target Coverage:** 80% across all metrics  
**Gap to Target:** ~42% statements, ~49% branches, ~53% functions, ~42% lines

---

## Executive Summary

This plan outlines a systematic approach to increase code coverage from **38% to 80%** by focusing on high-impact, low-effort wins first, then addressing critical gaps, and finally filling in remaining coverage holes.

**Estimated Total Effort:** 15-20 days  
**Expected Coverage After Completion:** 80%+ statements, 75%+ branches, 80%+ functions, 80%+ lines

---

## Current Coverage Breakdown

### ✅ Well-Covered Areas (>70%)
- **Server Services Core** (75-100%):
  - `repurposer.ts`: 100%
  - `blogPostGenerator.ts`: 96.77%
  - `conceptEnricher.ts`: 92.72%
  - `conceptProposer.ts`: 91.11%
  - `anchorExtractor.ts`: 100%
  - `config.ts`: 100%
  - `linkProposer.ts`: 94.91%
  - `vectorIndex.ts`: 88.33%

- **Libraries** (80-100%):
  - `data-validation.ts`: 92%
  - `error-messages.ts`: 100%
  - `json-utils.ts`: 100%
  - `logger.ts`: 100%
  - `text-processing.ts`: 85.71%

### ⚠️ Partially Covered (40-70%)
- **Server Services**:
  - `embeddingOrchestrator.ts`: 67.08% - Missing batch processing edge cases
  - `vectorSearch.ts`: 55.35% - Missing LLM error scenarios
  - `db.ts`: 48.43% - Missing connection error handling
  - `dependencies.ts`: ~50% (just added tests)

### ❌ Critical Gaps (<40%)
- **IPC Handlers**: Only 1 of 10 tested (10% coverage)
  - ✅ `enrichment-handlers.ts`: Tested
  - ❌ `link-handlers.ts`: 0%
  - ❌ `linkName-handlers.ts`: 0%
  - ❌ `capsule-handlers.ts`: 0%
  - ❌ `pdf-handlers.ts`: 0%
  - ❌ `ai-handlers.ts`: 0%
  - ❌ `config-handlers.ts`: 0%
  - ❌ `chat-handlers.ts`: 0%
  - ❌ `offer-handlers.ts`: 0%
  - ❌ `concept-handlers.ts`: 0% (needs verification)

- **IPC Client** (`src/lib/ipc-client.ts`): 27.32%
  - Missing: Error handling paths, edge cases, all IPC method calls

- **LLM Providers**: 9.52% (CRITICAL)
  - `gemini.ts`: 7.4%
  - `openai.ts`: 16.66%
  - `client.ts`: 35.41%

- **Components** (`src/components`): ~35%
  - Most complex components untested
  - Only basic components have tests

- **Hooks** (`src/hooks`): 35.35%
  - `useIPC.ts`: 35.35% - Core IPC hooks not fully tested
  - `useTimer.ts`: 0%

---

## Improvement Strategy

### Phase 1: Quick Wins (High Impact, Low Effort) - 3-4 days
**Target:** +10-15% coverage

#### 1.1 IPC Handler Tests (6 handlers) - 2-3 days
**Impact:** HIGH - Core API layer, ~15% of codebase  
**Effort:** Medium  
**Pattern:** Use existing `enrichment-handlers.test.ts` as template

**Priority Order:**
1. `link-handlers.test.ts` - Link CRUD operations (highest usage)
2. `linkName-handlers.test.ts` - Link name management
3. `ai-handlers.test.ts` - AI settings and embedding status
4. `config-handlers.test.ts` - Configuration management
5. `capsule-handlers.test.ts` - Capsule operations
6. `pdf-handlers.test.ts` - PDF extraction

**Approach:**
- Mock `electron/db.js` using `jest.mock()` pattern
- Use `invokeHandler` utility from `src/test/utils/ipc.ts`
- Test all CRUD operations, error cases, edge cases
- **Estimated Coverage Gain:** +8-10%

#### 1.2 Service Edge Cases - 1 day
**Impact:** MEDIUM - Fill gaps in existing services  
**Effort:** Low

**Tasks:**
- `embeddingOrchestrator.ts`: Add tests for batch processing edge cases
- `vectorSearch.ts`: Add tests for LLM error scenarios, corrupted embeddings
- `db.ts`: Add tests for connection error handling, migration utilities
- **Estimated Coverage Gain:** +2-3%

#### 1.3 Hooks Coverage - 1 day
**Impact:** MEDIUM - Core React hooks  
**Effort:** Low

**Tasks:**
- `useIPC.ts`: Test error handling, refetch logic, query caching
- `useTimer.ts`: Create comprehensive tests (currently 0%)
- **Estimated Coverage Gain:** +2-3%

---

### Phase 2: Critical Gaps (High Impact, Medium Effort) - 5-7 days
**Target:** +15-20% coverage

#### 2.1 IPC Client Tests - 2-3 days
**Impact:** HIGH - Used throughout renderer process  
**Effort:** Medium-High  
**Current Coverage:** 27.32%

**Tasks:**
- Test all IPC method calls (concept, link, capsule, pdf, ai, config, etc.)
- Test error handling when Electron API unavailable
- Test edge cases (null inputs, invalid data)
- Mock `window.electronAPI` for tests
- **Estimated Coverage Gain:** +5-7%

#### 2.2 LLM Provider Tests (Simplified) - 2-3 days
**Impact:** HIGH - Core functionality  
**Effort:** High (complex mocking required)  
**Current Coverage:** 9.52%

**Note:** Previous attempts failed due to SDK mocking complexity. New approach:

**Simplified Strategy:**
- Create integration-style tests that mock at SDK level (not provider level)
- Test provider initialization, model selection, error handling
- Test retry logic, fallback mechanisms
- Use `jest.mock()` for `@google/generative-ai` and `openai` SDKs
- **Estimated Coverage Gain:** +4-6%

#### 2.3 Component Tests (Priority Components) - 2-3 days
**Impact:** MEDIUM - UI layer  
**Effort:** Medium  
**Current Coverage:** ~35%

**Priority Components:**
1. `ConceptGenerationStatus.tsx` - Already tested, expand coverage
2. `Dashboard.tsx` - Main UI component
3. `SettingsTab.tsx` - Configuration UI
4. `ConfigTab.tsx` - Config management UI
5. `CapsulesTab.tsx` - Capsule management

**Approach:**
- Use React Testing Library
- Mock IPC calls using `useIPC` mocks
- Test user interactions, error states, loading states
- **Estimated Coverage Gain:** +3-5%

---

### Phase 3: Remaining Coverage (Medium Impact, Variable Effort) - 5-7 days
**Target:** +10-15% coverage

#### 3.1 Remaining IPC Handlers - 1-2 days
**Tasks:**
- `chat-handlers.test.ts` - Chat session management
- `offer-handlers.test.ts` - Offer management
- `concept-handlers.test.ts` - Verify/expand if missing
- **Estimated Coverage Gain:** +2-3%

#### 3.2 Remaining Component Tests - 2-3 days
**Tasks:**
- Test remaining components (PDF components, enrichment components, etc.)
- Focus on components with business logic
- **Estimated Coverage Gain:** +3-5%

#### 3.3 Branch Coverage Improvement - 2 days
**Tasks:**
- Add tests for conditional branches in services
- Test error paths, edge cases, null/undefined handling
- Test validation logic, boundary conditions
- **Estimated Coverage Gain:** +5-7%

---

## Detailed Implementation Plan

### Phase 1: Quick Wins

#### Task 1.1.1: link-handlers.test.ts
**File:** `src/test/ipc-handlers/link-handlers.test.ts`  
**Estimated Time:** 4-6 hours

**Test Cases:**
- `link:getAll` - with/without summary, with relations, empty results
- `link:getByConcept` - outgoing/incoming links, empty results
- `link:create` - new link, update existing, invalid linkNameId
- `link:update` - update notes, link not found
- `link:delete` - delete link, link not found

**Mocking Strategy:**
```typescript
jest.mock("../../../electron/db.js", () => ({
  getDb: jest.fn(),
  initDb: jest.fn(),
}));
```

#### Task 1.1.2: linkName-handlers.test.ts
**File:** `src/test/ipc-handlers/linkName-handlers.test.ts`  
**Estimated Time:** 3-4 hours

**Test Cases:**
- `linkName:getAll` - all link names, with filters
- `linkName:create` - create new, validation errors
- `linkName:update` - update link name, not found
- `linkName:delete` - soft delete, not found

#### Task 1.1.3: ai-handlers.test.ts
**File:** `src/test/ipc-handlers/ai-handlers.test.ts`  
**Estimated Time:** 4-5 hours

**Test Cases:**
- `ai:getSettings` - with/without API keys, provider selection
- `ai:updateSettings` - update provider, model, temperature
- `ai:getAvailableModels` - list models for providers
- `ai:getEmbeddingStatus` - status with/without concepts
- `ai:generateMissingEmbeddings` - batch processing
- `ai:retryFailedEmbeddings` - retry logic

#### Task 1.1.4: config-handlers.test.ts
**File:** `src/test/ipc-handlers/config-handlers.test.ts`  
**Estimated Time:** 3-4 hours

**Test Cases:**
- `config:getStatus` - config loading status
- `config:reload` - reload configs, error handling
- `config:validate` - validation results

#### Task 1.1.5: capsule-handlers.test.ts
**File:** `src/test/ipc-handlers/capsule-handlers.test.ts`  
**Estimated Time:** 5-6 hours

**Test Cases:**
- `capsule:list` - all capsules, with relations
- `capsule:getById` - get capsule with anchors
- `capsule:create` - create capsule, validation
- `capsule:createAnchorFromPDF` - PDF extraction, repurposing

#### Task 1.1.6: pdf-handlers.test.ts
**File:** `src/test/ipc-handlers/pdf-handlers.test.ts`  
**Estimated Time:** 3-4 hours

**Test Cases:**
- `pdf:extractText` - text extraction, error handling
- `pdf:extractAnchors` - anchor extraction

#### Task 1.2: Service Edge Cases
**Estimated Time:** 4-6 hours

**Files to Update:**
- `src/test/services/embeddingOrchestrator.test.ts`
  - Add: Large batch processing, progress callback edge cases
- `src/test/services/vectorSearch.test.ts`
  - Add: Corrupted embedding regeneration, batch error recovery
- `src/test/services/db.test.ts`
  - Add: Connection failures, migration errors, database preference handling

#### Task 1.3: Hooks Coverage
**Estimated Time:** 4-6 hours

**Files to Create/Update:**
- `src/test/hooks/useIPC.test.tsx`
  - Test: Error handling, refetch, query caching, enabled/disabled states
- `src/test/hooks/useTimer.test.tsx` (exists but 0% coverage)
  - Test: Timer start/stop, reset, callback execution

---

### Phase 2: Critical Gaps

#### Task 2.1: IPC Client Tests
**File:** `src/test/lib/ipc-client.test.ts`  
**Estimated Time:** 8-12 hours

**Test Strategy:**
- Mock `window.electronAPI` for each test
- Test all IPC methods (concept, link, capsule, pdf, ai, config, offer, chat)
- Test error handling when `electronAPI` unavailable
- Test input validation, edge cases

**Mock Setup:**
```typescript
const mockElectronAPI = {
  concept: { list: jest.fn(), create: jest.fn(), ... },
  link: { getAll: jest.fn(), ... },
  // ... all IPC methods
};

global.window = {
  electronAPI: mockElectronAPI,
} as any;
```

#### Task 2.2: LLM Provider Tests (Simplified)
**Files:** 
- `src/test/services/llm/providers/gemini.test.ts` (recreate)
- `src/test/services/llm/providers/openai.test.ts` (recreate)
- `src/test/services/llm/client.test.ts` (recreate)

**Estimated Time:** 12-16 hours

**New Approach:**
1. Mock SDKs at module level using `jest.mock()`
2. Create comprehensive mock implementations
3. Test initialization, method delegation, error handling
4. Test retry logic, model fallbacks

**Key Mocks:**
```typescript
// Mock @google/generative-ai
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
      embedContent: jest.fn(),
    }),
  })),
}));

// Mock openai
jest.mock("openai", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
    embeddings: { create: jest.fn() },
  })),
}));
```

#### Task 2.3: Priority Component Tests
**Estimated Time:** 8-12 hours

**Components to Test:**
1. `Dashboard.tsx` - Main dashboard, data loading, error states
2. `SettingsTab.tsx` - Settings management, provider selection
3. `ConfigTab.tsx` - Config loading, validation display
4. `CapsulesTab.tsx` - Capsule list, creation, anchor management

**Test Approach:**
- Use React Testing Library
- Mock `useIPC` hooks
- Test user interactions (clicks, form submissions)
- Test loading, error, and success states

---

### Phase 3: Remaining Coverage

#### Task 3.1: Remaining IPC Handlers
**Estimated Time:** 6-8 hours

**Files:**
- `src/test/ipc-handlers/chat-handlers.test.ts`
- `src/test/ipc-handlers/offer-handlers.test.ts`
- Verify `concept-handlers.test.ts` exists and is comprehensive

#### Task 3.2: Remaining Component Tests
**Estimated Time:** 8-12 hours

**Focus Areas:**
- PDF-related components
- Enrichment components
- Derivative content components
- Any components with business logic

#### Task 3.3: Branch Coverage
**Estimated Time:** 8-12 hours

**Strategy:**
- Run coverage report with branch details
- Identify untested branches
- Add tests for:
  - Error paths
  - Null/undefined handling
  - Boundary conditions
  - Validation logic
  - Conditional branches

---

## Success Metrics

### Coverage Targets by Phase

| Phase | Statements | Branches | Functions | Lines |
|-------|-----------|----------|-----------|-------|
| **Current** | 38.03% | 30.59% | 26.98% | 38.15% |
| **After Phase 1** | 48-53% | 40-45% | 36-41% | 48-53% |
| **After Phase 2** | 63-73% | 55-65% | 50-60% | 63-73% |
| **After Phase 3** | 80%+ | 75%+ | 80%+ | 80%+ |

### Quality Metrics
- All tests passing (currently 450/452 passing)
- No flaky tests
- Tests run in <10 seconds
- Clear test descriptions and organization

---

## Risk Mitigation

### Known Challenges

1. **IPC Handler Mocking Complexity**
   - **Risk:** Mocking `electron/db.js` may be difficult
   - **Mitigation:** Use existing `enrichment-handlers.test.ts` as proven pattern
   - **Fallback:** Create test utilities to simplify mocking

2. **LLM Provider SDK Mocking**
   - **Risk:** Previous attempts failed due to SDK complexity
   - **Mitigation:** Mock at SDK level, not provider level
   - **Fallback:** Create integration tests with real mocks

3. **Component Test Infrastructure**
   - **Risk:** Components may have complex dependencies
   - **Mitigation:** Use React Testing Library best practices
   - **Fallback:** Create component test utilities

4. **Time Estimates**
   - **Risk:** Tasks may take longer than estimated
   - **Mitigation:** Start with quick wins, adjust estimates as needed
   - **Fallback:** Prioritize high-impact areas

---

## Implementation Order

### Week 1: Phase 1 Quick Wins
- Day 1-2: IPC Handler tests (link, linkName, ai)
- Day 3: IPC Handler tests (config, capsule, pdf)
- Day 4: Service edge cases + Hooks coverage

### Week 2: Phase 2 Critical Gaps
- Day 1-2: IPC Client tests
- Day 3-4: LLM Provider tests (simplified approach)
- Day 5: Priority component tests

### Week 3: Phase 3 Remaining Coverage
- Day 1: Remaining IPC handlers
- Day 2-3: Remaining component tests
- Day 4-5: Branch coverage improvement

---

## Maintenance Plan

### Ongoing Coverage Maintenance
1. **Coverage Thresholds:** Set minimum 80% coverage for new code
2. **Pre-commit Hooks:** Warn if coverage drops below threshold
3. **Regular Reviews:** Monthly coverage reports
4. **Test Quality:** Focus on meaningful tests, not just coverage numbers

### Coverage Monitoring
- Run coverage reports weekly
- Track coverage trends
- Identify new gaps as codebase grows
- Update this plan as needed

---

## Notes

- **Focus on Quality:** Coverage numbers are a guide, not a goal. Prioritize meaningful tests.
- **Incremental Approach:** Complete one phase before moving to the next.
- **Test Patterns:** Reuse successful test patterns across similar files.
- **Documentation:** Update test documentation as patterns emerge.

---

**Last Updated:** January 4, 2026  
**Next Review:** After Phase 1 completion

