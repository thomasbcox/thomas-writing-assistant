# Code Coverage Report
**Generated:** January 5, 2026

## Current Coverage Summary

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| **Statements** | 44.05% | 80% | -35.95% |
| **Branches** | 35.28% | 80% | -44.72% |
| **Functions** | 30.59% | 80% | -49.41% |
| **Lines** | 44.16% | 80% | -35.84% |

**Overall Status:** 🟡 **44% coverage** - Good progress, but still below target

---

## Coverage by Directory

### ✅ Well-Covered Areas (>70%)

#### LLM Providers (93.71% Overall) ⭐
- **Gemini Provider** (`src/server/services/llm/providers/gemini.ts`):
  - Statements: 93.63%
  - Branches: 77.92%
  - Functions: 94.44%
  - Lines: 94.28%
- **OpenAI Provider** (`src/server/services/llm/providers/openai.ts`):
  - Statements: 93.87%
  - Branches: 86.11%
  - Functions: 90%
  - Lines: 95.65%

**Note:** Excellent coverage achieved through manual mocks pattern implemented January 5, 2026.

#### Server Services (75.72% Overall)
- `repurposer.ts`: 95.55%
- `blogPostGenerator.ts`: 91.66%
- `conceptEnricher.ts`: 89.33%
- `conceptProposer.ts`: 88.57%
- `anchorExtractor.ts`: 88.23%
- `vectorIndex.ts`: 88.33%

### ⚠️ Partially Covered (40-70%)

#### Server Services (continued)
- `config.ts`: 66.97% - Missing edge cases
- `embeddingOrchestrator.ts`: 67.08% - Missing batch processing edge cases
- `linkProposer.ts`: 63.51% - Missing error handling paths

#### Server Core (54.24%)
- `db.ts`: 48.43% - Missing connection error handling
- `schema.ts`: 64.19% - Schema utilities not tested
- `dependencies.ts`: 0% - Dependency injection not tested

#### Lib Utilities (43.06%)
- `data-validation.ts`: 92% ✅
- `text-processing.ts`: 85.71% ✅
- `logger.ts`: 82.14% ✅
- `ipc-client.ts`: 6.11% ❌ - Critical gap

### ❌ Critical Gaps (0-40%)

#### Components (0-52.7%)
- All enrichment components: 0%
- PDF components: 0%
- Derivative components: 0%
- Most UI components have minimal coverage

#### IPC Client (6.11%)
- `ipc-client.ts` has very low coverage
- Type-safe IPC client needs more tests

---

## Recent Improvements

### LLM Provider Coverage (January 5, 2026)
- ✅ Created manual mocks for `@google/generative-ai` and `openai` SDKs
- ✅ Added comprehensive test suites:
  - `gemini.test.ts`: 29 tests
  - `openai.test.ts`: 25 tests
- ✅ Achieved 93.71% overall coverage for LLM providers
- ✅ All provider tests passing

### Test Infrastructure
- ✅ Manual mocks pattern for SDKs
- ✅ Jest fake timers for exponential backoff testing
- ✅ Proper TypeScript type annotations for mocks

---

## Coverage Targets

### Current State
- **Statements**: 44.05%
- **Branches**: 35.28%
- **Functions**: 30.59%
- **Lines**: 44.16%

### Recommended Targets (Phased Approach)

**Phase 1 (Short-term - 1-2 weeks)**
- **Statements**: 50%
- **Branches**: 45%
- **Functions**: 40%
- **Lines**: 50%

**Phase 2 (Medium-term - 1 month)**
- **Statements**: 60%
- **Branches**: 55%
- **Functions**: 50%
- **Lines**: 60%

**Phase 3 (Long-term - 3 months)**
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 75%
- **Lines**: 80%

---

## Priority Areas for Coverage Improvement

### High Priority 🔴
1. **IPC Client** (6.11%) - Critical for type safety
2. **Components** (0-52.7%) - UI reliability
3. **Error Handling Paths** - Production stability

### Medium Priority 🟠
1. **Dependencies** (0%) - Dependency injection testing
2. **Edge Cases** - Boundary conditions
3. **Integration Tests** - End-to-end flows

### Low Priority 🟢
1. **Schema Utilities** - Already partially covered
2. **Legacy Code** - Deprecated features

---

## Coverage Commands

```bash
# Generate coverage report
npm test -- --coverage

# View HTML report
open coverage/index.html

# Coverage with specific reporters
npm test -- --coverage --coverageReporters=text
npm test -- --coverage --coverageReporters=html
```

---

## Conclusion

**Current Status**: 🟡 **44% coverage** - Good progress, significant improvement needed

While LLM provider coverage is excellent (93.71%), overall coverage is still below the 80% target. The main gaps are in React components, IPC client, and error handling paths.

**Priority**: Focus on increasing component coverage and fixing critical gaps in IPC client and error handling.
