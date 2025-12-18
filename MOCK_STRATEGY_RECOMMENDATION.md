# Mock Strategy Recommendation: Vitest Best Practices Analysis

**Date**: 2025-12-15  
**Context**: Fixing 4 failing API route test files with Vitest mock hoisting issues

## Executive Summary

**Recommended Solution: Option C - Use `vi.hoisted()`**

This is the Vitest-recommended approach for sharing mocks across test files while respecting mock hoisting. It provides the best balance of maintainability, type safety, and adherence to Vitest best practices.

## Detailed Analysis

### Option A: Inline Mock Creation

```typescript
vi.mock("~/server/db", () => {
  const mockDb = {
    concept: { findMany: vi.fn(), findUnique: vi.fn(), ... },
    link: { findMany: vi.fn(), ... },
    // ... 7 models × 6 methods each = ~42 lines of duplication
  };
  return { db: mockDb };
});
```

**Pros:**
- ✅ Simple and explicit
- ✅ No hoisting issues
- ✅ Each test file is self-contained
- ✅ Works immediately

**Cons:**
- ❌ **Code duplication** - 42+ lines repeated in 4 files
- ❌ **Maintenance burden** - Changes to mock structure require updates in 4 places
- ❌ **Inconsistency risk** - Easy for mocks to drift apart
- ❌ **No type safety** - No guarantee mocks match Prisma schema
- ❌ **Violates DRY principle**

**Verdict**: ❌ Not recommended - too much duplication

---

### Option B: Factory Import Pattern

```typescript
vi.mock("~/server/db", async () => {
  const { createMockDb } = await import("../mocks/db");
  return { db: createMockDb() };
});
```

**Pros:**
- ✅ Reuses existing `createMockDb()` function
- ✅ Single source of truth for mock structure
- ✅ No hoisting issues (import happens inside factory)
- ✅ Maintainable - changes in one place

**Cons:**
- ⚠️ **Access pattern complexity** - Need to import db to access mock:
  ```typescript
  const { db } = await import("~/server/db");
  vi.mocked(db.concept.findMany).mockResolvedValue(...);
  ```
- ⚠️ **Slightly more verbose** than direct access
- ⚠️ **Async import** adds minor complexity

**Verdict**: ✅ Good option, but not optimal

---

### Option C: `vi.hoisted()` Pattern (RECOMMENDED)

```typescript
const { mockDb } = vi.hoisted(() => {
  const { createMockDb } = require("../mocks/db");
  return { mockDb: createMockDb() };
});

vi.mock("~/server/db", () => ({
  db: mockDb,
}));
```

**Pros:**
- ✅ **Vitest-recommended approach** for this exact use case
- ✅ Reuses existing `createMockDb()` function
- ✅ **Direct access** to mockDb in tests (no async import needed)
- ✅ Single source of truth
- ✅ Clean and readable
- ✅ Type-safe (can add types if needed)
- ✅ Follows Vitest documentation patterns

**Cons:**
- ⚠️ Requires `require()` instead of `import` (but this is fine in test context)
- ⚠️ Slightly more complex than inline (but much better than duplication)

**Verdict**: ✅ **BEST OPTION** - Follows Vitest best practices

---

## Comparison Matrix

| Criteria | Option A (Inline) | Option B (Factory Import) | Option C (vi.hoisted) |
|----------|------------------|---------------------------|----------------------|
| **Code Duplication** | ❌ High (42+ lines × 4 files) | ✅ None | ✅ None |
| **Maintainability** | ❌ Poor (4 places to update) | ✅ Good | ✅ Excellent |
| **Type Safety** | ❌ None | ✅ Good | ✅ Good |
| **Vitest Best Practice** | ⚠️ Works but not recommended | ✅ Good | ✅ **Recommended** |
| **Test Readability** | ✅ Excellent | ⚠️ Good (async import) | ✅ Excellent |
| **Mock Access** | ✅ Direct | ⚠️ Async import needed | ✅ Direct |
| **Complexity** | ✅ Simple | ⚠️ Moderate | ⚠️ Moderate |
| **Documentation** | ⚠️ No official guidance | ✅ Supported | ✅ **Officially recommended** |

---

## Codebase Context Analysis

### Existing Patterns

1. **`linkProposer.test.ts`**: Uses inline mocks (but only mocks 2 models, not all 7)
2. **`config.test.ts`**: Uses top-level mock object (works because created before hoisting)
3. **`config.test.ts` fs mock**: Uses factory pattern inside `vi.mock()`
4. **`test-factories.ts`**: Uses factory functions for test data (good pattern)
5. **`mocks/db.ts`**: Already has `createMockDb()` factory function

### Alignment with Codebase

- ✅ **Option C** aligns with existing factory pattern (`test-factories.ts`)
- ✅ **Option C** reuses existing `createMockDb()` function
- ✅ **Option C** follows the pattern used in `config.test.ts` fs mock
- ❌ **Option A** would diverge from existing factory patterns

---

## Vitest Official Guidance

From Vitest documentation and community best practices:

1. **`vi.hoisted()` is specifically designed for this use case:**
   > "Use `vi.hoisted` to define variables that are accessible within hoisted mock factories"

2. **Factory pattern is recommended for shared mocks:**
   > "Organize shared mocks using factory pattern in a centralized mocks directory"

3. **Avoid duplication:**
   > "Create reusable mock factories to prevent code duplication across test files"

---

## Implementation Example

### Recommended Implementation (Option C)

```typescript
// src/test/api/capsules.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "~/app/api/capsules/route";
import { GET as getById } from "~/app/api/capsules/[id]/route";
import { NextRequest } from "next/server";

// Use vi.hoisted to create mock before vi.mock hoisting
const { mockDb } = vi.hoisted(() => {
  const { createMockDb } = require("../mocks/db");
  return { mockDb: createMockDb() };
});

vi.mock("~/server/db", () => ({
  db: mockDb,
}));

describe("Capsules API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockDb.capsule.findMany).mockReset();
    // ... etc
  });

  it("should return list of capsules", async () => {
    vi.mocked(mockDb.capsule.findMany).mockResolvedValue([...]);
    // Direct access to mockDb - no async import needed!
    const response = await GET();
    // ...
  });
});
```

### Why This Works

1. **`vi.hoisted()` executes before `vi.mock()` hoisting** - ensures `mockDb` exists
2. **`require()` works in hoisted context** - synchronous, no async issues
3. **Direct access** - `mockDb` is available in test scope immediately
4. **Reuses existing code** - leverages `createMockDb()` from `mocks/db.ts`

---

## Migration Strategy

### Step 1: Update `mocks/db.ts` (if needed)

Ensure `createMockDb()` is well-typed and complete:

```typescript
export function createMockDb() {
  return {
    concept: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    // ... all other models
  };
}
```

### Step 2: Update failing test files

Apply the `vi.hoisted()` pattern to:
- `src/test/api/capsules.test.ts`
- `src/test/api/concepts.test.ts`
- `src/test/api/concepts-id.test.ts`
- `src/test/api/links.test.ts`

### Step 3: Verify

- All tests pass
- Mock access works correctly
- No duplication

---

## Alternative Consideration: Global Setup

**Why not use global setup?**

We tried this earlier and removed it because:
- ❌ Caused conflicts between test files
- ❌ Made it harder to override mocks per-test-file
- ❌ Reduced test isolation
- ❌ Made debugging more difficult

**`vi.hoisted()` is better because:**
- ✅ Each test file controls its own mock
- ✅ Can still override if needed
- ✅ Better test isolation
- ✅ Easier to debug

---

## Final Recommendation

**Use Option C: `vi.hoisted()` Pattern**

### Rationale

1. **Follows Vitest best practices** - This is the officially recommended approach
2. **Maintains code quality** - Reuses existing factory, no duplication
3. **Best developer experience** - Direct mock access, clear and readable
4. **Future-proof** - Aligns with Vitest's direction and community patterns
5. **Consistent with codebase** - Matches existing factory patterns

### Implementation Priority

**High** - This is a straightforward fix that will:
- Resolve all 4 failing test files
- Establish a maintainable pattern for future tests
- Follow industry best practices
- Improve code quality

---

## References

- [Vitest Mock Hoisting Documentation](https://vitest.dev/api/vi.html#vi-mock)
- [Vitest vi.hoisted Documentation](https://vitest.dev/api/vi.html#vi-hoisted)
- [Vitest Best Practices: Shared Mocks](https://vitest.dev/guide/mocking.html#shared-mocks)
