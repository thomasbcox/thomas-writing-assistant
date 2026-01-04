# Code Coverage Report
**Generated:** January 03, 2026

## Current Coverage Summary

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| **Statements** | 38.08% | 80% | -41.92% |
| **Branches** | 30.74% | 80% | -49.26% |
| **Functions** | 27.05% | 80% | -52.95% |
| **Lines** | 38.17% | 80% | -41.83% |

**Overall Status:** 🟡 **38% coverage** - Significant improvement needed

---

## Coverage by Directory

### ✅ Well-Covered Areas (>70%)
- **Server Services** (75.72%): Core business logic is well-tested
  - `repurposer.ts`: 95.55%
  - `blogPostGenerator.ts`: 91.66%
  - `conceptEnricher.ts`: 89.33%
  - `conceptProposer.ts`: 88.57%
  - `anchorExtractor.ts`: 88.23%
  - `vectorIndex.ts`: 88.33%

### ⚠️ Partially Covered (40-70%)
- **Server Services** (continued):
  - `config.ts`: 66.97% - Missing edge cases
  - `embeddingOrchestrator.ts`: 67.08% - Missing batch processing edge cases
  - `linkProposer.ts`: 63.51% - Missing error handling paths
  - `vectorSearch.ts`: 55.35% - Missing LLM error scenarios

- **Server Core** (54.24%):
  - `db.ts`: 48.43% - Missing connection error handling
  - `schema.ts`: 64.19% - Schema utilities not tested
  - `dependencies.ts`: 0% - Dependency injection not tested

- **Lib Utilities** (43.06%):
  - `data-validation.ts`: 92% ✅
  - `text-processing.ts`: 85.71% ✅
  - `logger.ts`: 82.14% ✅
  - `ipc-client.ts`: 6.11% ❌ - Critical gap

### ❌ Critical Gaps (0-40%)
- **Components** (0-52.7%):
  - All enrichment components: 0%
  - PDF components: 0%
  - Derivative components: 0%
  - UI components: 52.7% (mixed)

- **Hooks** (32.17%):
  - `useIPC.ts`: 27.87% - Core IPC hooks not tested
  - `useErrorHandler.ts`: 0% - Error handling not tested

- **API Layer** (0%):
  - `blog-posts.ts`: 0%
  - `concepts.ts`: 0%
  - `enrichment.ts`: 0%
  - `health.ts`: 0%

- **LLM Providers** (9.43%):
  - `gemini.ts`: 10% - Critical integration not tested
  - `openai.ts`: 8.16% - Critical integration not tested

---

## Priority Areas for Coverage Improvement

### 🔴 **Priority 1: Critical Infrastructure (Target: 80%)**

#### 1. LLM Providers (Current: 9.43% → Target: 80%)
**Impact:** High - Core functionality depends on these
- `src/server/services/llm/providers/gemini.ts` (10%)
- `src/server/services/llm/providers/openai.ts` (8.16%)
- `src/server/services/llm/client.ts` (46.93%)

**Plan:**
- Test provider initialization
- Test API error handling (rate limits, auth failures)
- Test response parsing and validation
- Test retry logic
- Test streaming responses (if applicable)

**Estimated Effort:** 2-3 days
**Expected Coverage Gain:** +5-7% overall

#### 2. IPC Client (Current: 6.11% → Target: 80%)
**Impact:** High - All frontend-backend communication
- `src/lib/ipc-client.ts` (6.11%)

**Plan:**
- Test IPC method calls
- Test error handling
- Test response parsing
- Test timeout handling

**Estimated Effort:** 1-2 days
**Expected Coverage Gain:** +2-3% overall

#### 3. Database & Dependencies (Current: 48.43% → Target: 80%)
**Impact:** High - Core data layer
- `src/server/db.ts` (48.43%)
- `src/server/dependencies.ts` (0%)

**Plan:**
- Test connection error handling
- Test transaction rollback
- Test database switching logic
- Test dependency injection container

**Estimated Effort:** 1-2 days
**Expected Coverage Gain:** +2-3% overall

---

### 🟡 **Priority 2: Service Layer Gaps (Target: 80%)**

#### 4. Vector Search & Embeddings (Current: 55.35% → Target: 80%)
**Impact:** Medium-High - Core search functionality
- `src/server/services/vectorSearch.ts` (55.35%)
- `src/server/services/embeddingOrchestrator.ts` (67.08%)

**Plan:**
- Test LLM error handling in embedding generation
- Test batch processing edge cases
- Test vector search with empty results
- Test embedding dimension mismatches

**Estimated Effort:** 1-2 days
**Expected Coverage Gain:** +3-4% overall

#### 5. Link Proposer (Current: 63.51% → Target: 80%)
**Impact:** Medium - Link generation
- `src/server/services/linkProposer.ts` (63.51%)

**Plan:**
- Test error handling paths (lines 177-185, 197-213, 330-421)
- Test edge cases with no candidates
- Test invalid LLM responses

**Estimated Effort:** 1 day
**Expected Coverage Gain:** +1-2% overall

#### 6. Config Service (Current: 66.97% → Target: 80%)
**Impact:** Medium - Configuration management
- `src/server/services/config.ts` (66.97%)

**Plan:**
- Test missing config file scenarios
- Test invalid YAML parsing
- Test config validation edge cases (lines 99-101, 117-119, 134-136, 152, 173, 185, 191-213, 223-226, 251-272)

**Estimated Effort:** 1 day
**Expected Coverage Gain:** +1-2% overall

---

### 🟢 **Priority 3: Frontend & UI (Target: 60-80%)**

#### 7. IPC Hooks (Current: 27.87% → Target: 70%)
**Impact:** Medium - Frontend data fetching
- `src/hooks/useIPC.ts` (27.87%)

**Plan:**
- Test query hooks (useQuery)
- Test mutation hooks (useMutation)
- Test error states
- Test loading states

**Estimated Effort:** 2-3 days
**Expected Coverage Gain:** +3-4% overall

#### 8. React Components (Current: 0-52.7% → Target: 60%)
**Impact:** Low-Medium - UI functionality
- Enrichment components: 0%
- PDF components: 0%
- UI components: 52.7%

**Plan:**
- Test component rendering
- Test user interactions
- Test error boundaries
- Test loading states

**Estimated Effort:** 3-5 days
**Expected Coverage Gain:** +5-8% overall

#### 9. API Layer (Current: 0% → Target: 70%)
**Impact:** Low-Medium - API route handlers
- `src/lib/api/*.ts` (0%)

**Plan:**
- Test API route handlers
- Test request validation
- Test error responses
- Test authentication (if applicable)

**Estimated Effort:** 2-3 days
**Expected Coverage Gain:** +2-3% overall

---

## Implementation Plan

### Phase 1: Critical Infrastructure (Week 1-2)
**Goal:** Reach 50% overall coverage

1. **LLM Providers** (2-3 days)
   - Create test files for `gemini.ts` and `openai.ts`
   - Mock API responses
   - Test error scenarios

2. **IPC Client** (1-2 days)
   - Test all IPC methods
   - Test error handling

3. **Database Layer** (1-2 days)
   - Test connection errors
   - Test transaction handling

**Expected Result:** 50% overall coverage

### Phase 2: Service Layer Completion (Week 3-4)
**Goal:** Reach 65% overall coverage

4. **Vector Search** (1-2 days)
5. **Link Proposer** (1 day)
6. **Config Service** (1 day)

**Expected Result:** 65% overall coverage

### Phase 3: Frontend & Integration (Week 5-6)
**Goal:** Reach 80% overall coverage

7. **IPC Hooks** (2-3 days)
8. **React Components** (3-5 days)
9. **API Layer** (2-3 days)

**Expected Result:** 80% overall coverage

---

## Quick Wins (High Impact, Low Effort)

1. **Add error handling tests** to existing service tests
   - Estimated: +2-3% coverage
   - Effort: 4-6 hours

2. **Test edge cases** in well-covered services
   - Estimated: +1-2% coverage
   - Effort: 2-4 hours

3. **Add missing branch coverage** in config service
   - Estimated: +1% coverage
   - Effort: 2-3 hours

4. **Test database error scenarios**
   - Estimated: +1-2% coverage
   - Effort: 2-4 hours

---

## Coverage Targets by Category

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Server Services | 75.72% | 85% | Medium |
| Server Core | 54.24% | 80% | High |
| LLM Providers | 9.43% | 80% | **Critical** |
| IPC Client | 6.11% | 80% | **Critical** |
| Hooks | 32.17% | 70% | Medium |
| Components | 0-52.7% | 60% | Low |
| API Layer | 0% | 70% | Medium |
| Lib Utilities | 43.06% | 80% | Medium |

---

## Metrics to Track

- **Overall Coverage:** 38.08% → 80%
- **Branch Coverage:** 30.74% → 80% (critical for reliability)
- **Function Coverage:** 27.05% → 80%
- **Line Coverage:** 38.17% → 80%

---

## Notes

- Focus on **branch coverage** - it's the lowest (30.74%) and most critical for reliability
- Prioritize **critical infrastructure** (LLM, IPC, DB) before UI components
- Use **integration tests** for complex flows
- Maintain **test quality** - avoid testing implementation details

---

## Next Steps

1. ✅ Fix failing tests (completed)
2. 🔄 Start Phase 1: LLM Provider tests
3. 📊 Track coverage weekly
4. 🎯 Aim for 50% by end of Week 2
5. 🎯 Aim for 80% by end of Week 6

