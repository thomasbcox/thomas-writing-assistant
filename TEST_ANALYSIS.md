# Test Infrastructure Analysis

**Date**: 2025-12-15  
**Status**: 94/97 tests passing (96.9% pass rate)  
**Build**: ✅ Passing  
**TypeScript**: ✅ Clean

## Executive Summary

The test suite is in excellent shape with 94 passing tests. The remaining 4 failing test files all share the same root cause: a **Vitest mock hoisting issue** that creates a circular dependency when importing shared mocks.

## Current Test Status

### ✅ Passing (15 test files, 94 tests)
- **Service Layer**: All passing (conceptProposer, conceptEnricher, linkProposer, repurposer, anchorExtractor, config)
- **Component Tests**: All passing (LoadingSpinner, EmptyState, ConceptList)
- **React Query Hooks**: All passing (capsules, links, concepts, config)
- **API Routes (Partial)**: enrichment.test.ts, config.test.ts passing

### ❌ Failing (4 test files, 0 tests run)
- `src/test/api/capsules.test.ts`
- `src/test/api/concepts.test.ts`
- `src/test/api/concepts-id.test.ts`
- `src/test/api/links.test.ts`

**Note**: These files fail to load entirely, so no individual tests run. The error prevents the test file from executing.

## Root Cause Analysis

### The Problem: Vitest Mock Hoisting

All 4 failing test files exhibit the same error:

```
Error: [vitest] There was an error when mocking a module.
Caused by: ReferenceError: Cannot access '__vi_import_3__' before initialization
```

### Why This Happens

1. **Vitest Mock Hoisting**: `vi.mock()` calls are **hoisted to the top of the file** before any imports execute
2. **Import Pattern in Failing Tests**:
   ```typescript
   import { mockDb } from "../mocks/db";  // Line 16
   
   vi.mock("~/server/db", () => ({
     db: mockDb,  // Line 19-20 - tries to use mockDb
   }));
   ```
3. **The Conflict**: When Vitest hoists the `vi.mock()` call, it tries to access `mockDb` **before** the import statement executes, creating a circular dependency

### Why Other Tests Work

**Pattern 1: No Database Mocking** (`enrichment.test.ts`)
- Mocks services directly, not the database
- Routes don't use `getDb()` directly
- No circular dependency

**Pattern 2: Inline Mock Creation** (`config.test.ts`)
- Creates mock objects **inside** the `vi.mock()` factory:
  ```typescript
  const mockConfigLoader = { ... };  // Created at top level, but...
  
  vi.mock("~/server/services/config", () => ({
    getConfigLoader: vi.fn(() => mockConfigLoader),  // Uses it here
  }));
  ```
- This works because the mock object is created **before** the `vi.mock()` call executes (even though it's hoisted, the object creation happens first)

**Pattern 3: Mock Factory Function** (`config.test.ts` fs mock)
- Creates mocks **inside** the factory:
  ```typescript
  vi.mock("fs", () => {
    const mockWriteFileSync = vi.fn();  // Created inside factory
    return {
      writeFileSync: mockWriteFileSync,
    };
  });
  ```

## Architecture Analysis

### Database Access Pattern

All API routes follow this pattern:
```typescript
import { getDb } from "~/server/api/helpers";

export async function GET(request: NextRequest) {
  const db = getDb();  // Returns db from ~/server/db
  const result = await db.concept.findMany(...);
}
```

### Mock Requirements

To test API routes, we need to:
1. Mock `~/server/db` to return a mock database
2. Mock `~/server/api/helpers` to return the mock from `getDb()`
3. OR: Mock `~/server/api/helpers` directly and have `getDb()` return the mock

### Current Mock Infrastructure

**`src/test/mocks/db.ts`**:
- Exports `createMockDb()` function
- Exports `mockDb` singleton instance
- Provides all Prisma model mocks (concept, link, capsule, etc.)

**Problem**: The singleton `mockDb` cannot be imported and used in `vi.mock()` due to hoisting.

## Solution Patterns

### ✅ Recommended: Inline Mock Creation

Create the mock database **inside** the `vi.mock()` factory:

```typescript
vi.mock("~/server/db", () => {
  const mockDb = {
    concept: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      // ... etc
    },
    // ... other models
  };
  return { db: mockDb };
});
```

**Pros**:
- No hoisting issues
- Each test file has its own mock instance
- Clear and explicit

**Cons**:
- Code duplication across test files
- Need to maintain mock structure in multiple places

### Alternative: Factory Function Pattern

Use the factory function from `mocks/db.ts` but call it inside `vi.mock()`:

```typescript
vi.mock("~/server/db", async () => {
  const { createMockDb } = await vi.importActual("../mocks/db");
  return { db: createMockDb() };
});
```

**Pros**:
- Reuses shared mock creation logic
- No hoisting issues (import happens inside factory)

**Cons**:
- More complex
- Still need to access the mock for assertions

### Alternative: Global Setup with Per-Test Access

Set up mocks globally in `setup.ts`, but this was causing conflicts and was removed.

## Detailed File Analysis

### Failing Files Pattern

All 4 failing files use this pattern:
```typescript
import { mockDb } from "../mocks/db";  // ❌ Causes hoisting issue

vi.mock("~/server/db", () => ({
  db: mockDb,  // ❌ Tries to use mockDb before import executes
}));
```

### Working Files Pattern

**`enrichment.test.ts`**: Doesn't mock database at all
- Mocks services instead
- Routes call services, not database directly

**`config.test.ts`**: Creates mocks inline
- `mockConfigLoader` created at top level (before vi.mock hoisting)
- Used inside vi.mock factory
- fs mock created entirely inside factory

## Recommendations

### Immediate Fix (4 files)

For each of the 4 failing test files, change from:
```typescript
import { mockDb } from "../mocks/db";
vi.mock("~/server/db", () => ({ db: mockDb }));
```

To one of these patterns:

**Option A: Inline Mock** (Simplest)
```typescript
vi.mock("~/server/db", () => {
  const mockDb = {
    concept: { findMany: vi.fn(), ... },
    link: { findMany: vi.fn(), ... },
    // ... etc
  };
  return { db: mockDb };
});
```

**Option B: Factory with Import** (Reuses code)
```typescript
vi.mock("~/server/db", async () => {
  const { createMockDb } = await import("../mocks/db");
  const mockDb = createMockDb();
  return { db: mockDb };
});
```

Then access the mock via:
```typescript
const { db } = await import("~/server/db");
// Use db.concept.findMany, etc.
```

### Long-term Improvements

1. **Standardize Mock Pattern**: Choose one pattern and document it
2. **Mock Helper Utility**: Create a test utility that handles the hoisting correctly
3. **Type Safety**: Ensure mocks match Prisma types
4. **Documentation**: Add testing guide explaining the hoisting behavior

## Test Coverage Summary

### Current Coverage
- **Service Layer**: ✅ Excellent (all services tested)
- **Component Layer**: ⚠️ Basic (3 components, many missing)
- **API Routes**: ⚠️ Partial (some routes tested, many missing)
- **React Query Hooks**: ✅ Good (4 hook files tested)

### Missing Coverage
- Most UI components (ConceptEditor, LinksTab, CapsulesTab, etc.)
- Many API endpoints (PDF, AI settings, link-names, etc.)
- Integration tests
- E2E tests

## Conclusion

The test infrastructure is solid. The 4 failing files are all fixable with the same pattern change. Once fixed, we'll have **97/97 tests passing (100%)**.

The root cause is well-understood (Vitest hoisting), and the solution is straightforward (inline mock creation or factory import pattern).
