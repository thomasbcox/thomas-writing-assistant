# Error Handling Pattern Assessment: link.ts Router

**Status**: ✅ **COMPLETED** - All improvements have been implemented (December 2025)

## Implementation Summary

All recommended improvements have been successfully implemented:
- ✅ Type safety with `error: unknown`
- ✅ Structured logging with `logServiceError`
- ✅ Specific error catching with `isDrizzleRelationError()` helper
- ✅ Removed unsafe assertions
- ✅ Fallback error handling
- ✅ Standardized batched query patterns

See `src/server/api/routers/link.ts` for the current implementation.

---

## Original Assessment: Current Implementation Issues

### 1. **Error Type Safety** ❌
**Issue**: Using `error: any` instead of `error: unknown`
```typescript
catch (error: any) {
  console.error("Drizzle relation error in link.getAll, using batched fallback:", error.message);
}
```

**Problems**:
- `any` disables type checking
- `error.message` may not exist if error isn't an Error instance
- No type safety guarantees

**Best Practice**:
```typescript
catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  // ...
}
```

### 2. **Error Logging Inconsistency** ❌
**Issue**: Using `console.error` instead of structured logging service

**Current Pattern**:
```typescript
console.error("Drizzle relation error in link.getAll, using batched fallback:", error.message);
```

**Codebase Standard** (from other routers):
```typescript
logServiceError(error, "enrichment.analyze", { conceptTitle: input.title });
```

**Problems**:
- Inconsistent with codebase patterns
- No structured logging metadata
- Harder to track in production
- Missing context (operation, input params, etc.)

### 3. **Error Swallowing** ⚠️
**Issue**: Silently falling back without proper error propagation

**Current Pattern**:
- Catches ALL errors (not just Drizzle relation errors)
- Swallows the error and falls back
- No way for caller to know the primary path failed

**Problems**:
- Could mask non-Drizzle errors (network, database connection, etc.)
- No visibility into failure rate
- Makes debugging harder
- Could hide critical issues

**Best Practice**: Only catch specific expected errors:
```typescript
catch (error: unknown) {
  // Check if it's the specific Drizzle relation error we expect
  if (error instanceof Error && error.message.includes("referencedTable")) {
    // Fallback
  } else {
    // Re-throw unexpected errors
    throw error;
  }
}
```

### 4. **Inconsistent Fallback Patterns** ⚠️
**Issue**: Different fallback strategies in different methods

**Current State**:
- `getAll` and `getByConcept`: Use optimized batched queries (3 queries)
- `create` (update/new): Use N+1 queries (3 separate queries per link)

**Problem**: Inconsistent performance characteristics

### 5. **Unsafe Non-Null Assertions** ❌
**Issue**: Using `!` operator without validation
```typescript
return fullLink!;  // What if fullLink is undefined?
```

**Problem**: Could return undefined, causing runtime errors downstream

**Best Practice**:
```typescript
if (!fullLink) {
  throw new Error("Failed to load link with relations");
}
return fullLink;
```

### 6. **No Fallback Error Handling** ❌
**Issue**: Fallback code itself could fail, but isn't wrapped

**Current Pattern**:
```typescript
catch (error: any) {
  // Fallback code - but what if THIS fails?
  const linksData = await ctx.db.select()...
}
```

**Problem**: If fallback fails, error bubbles up without context

### 7. **Missing Error Context** ⚠️
**Issue**: Error messages don't include operation context

**Current**:
```typescript
console.error("Drizzle relation error in link.getAll, using batched fallback:", error.message);
```

**Better**:
```typescript
logServiceError(error, "link.getAll", { 
  summary: input?.summary,
  fallbackUsed: true 
});
```

### 8. **No Error Metrics/Monitoring** ⚠️
**Issue**: Can't track how often fallback is used

**Problem**: No visibility into:
- How often Drizzle API fails
- Whether the issue is resolved
- Performance impact of fallback

## Recommended Improvements

### Priority 1: Critical Fixes

1. **Replace `any` with `unknown`**:
```typescript
catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  // ...
}
```

2. **Use structured logging**:
```typescript
import { logServiceError } from "~/lib/logger";

catch (error: unknown) {
  logServiceError(error, "link.getAll", { 
    summary: input?.summary,
    fallbackUsed: true 
  });
  // fallback...
}
```

3. **Add error type checking**:
```typescript
catch (error: unknown) {
  // Only catch specific Drizzle relation errors
  if (error instanceof Error && 
      (error.message.includes("referencedTable") || 
       error.message.includes("relation"))) {
    // Use fallback
  } else {
    // Re-throw unexpected errors
    throw error;
  }
}
```

4. **Remove unsafe non-null assertions**:
```typescript
const fullLink = await ctx.db.query.link.findFirst({...});
if (!fullLink) {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to load link with relations",
  });
}
return fullLink;
```

### Priority 2: Consistency & Reliability

5. **Standardize fallback patterns**:
   - Use batched queries everywhere (not N+1 in `create`)

6. **Add fallback error handling**:
```typescript
try {
  // Primary path
} catch (error: unknown) {
  // Fallback
  try {
    // Fallback implementation
  } catch (fallbackError: unknown) {
    // Both paths failed - log and throw
    logServiceError(fallbackError, "link.getAll.fallback", { originalError: error });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to load links",
    });
  }
}
```

7. **Add error context**:
```typescript
logServiceError(error, "link.getAll", {
  operation: "getAll",
  summary: input?.summary,
  fallbackUsed: true,
  errorType: error instanceof Error ? error.constructor.name : "Unknown",
});
```

### Priority 3: Observability

8. **Add metrics** (if monitoring available):
   - Track fallback usage rate
   - Track error types
   - Performance comparison

## Maturity Assessment

### Current State: ⚠️ **Needs Improvement**

**Score: 4/10**

**Strengths**:
- ✅ Has fallback mechanism
- ✅ Attempts to handle errors gracefully
- ✅ Uses optimized batching in some places

**Weaknesses**:
- ❌ Type safety issues (`any`)
- ❌ Inconsistent with codebase patterns
- ❌ Swallows all errors (not specific)
- ❌ No structured logging
- ❌ Unsafe non-null assertions
- ❌ No fallback error handling
- ❌ Missing error context

### Target State: ✅ **Production Ready**

**Score: 8/10** (with recommended fixes)

**Requirements**:
- Proper error type handling (`unknown`)
- Structured logging with context
- Specific error catching (not all errors)
- Consistent fallback patterns
- Safe error propagation
- Proper error context

## Code Example: Improved Pattern

```typescript
import { TRPCError } from "@trpc/server";
import { logServiceError } from "~/lib/logger";

// Helper to check if error is Drizzle relation error
function isDrizzleRelationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("referencedTable") ||
     error.message.includes("relation") ||
     error.message.includes("Cannot read properties of undefined"))
  );
}

getAll: publicProcedure
  .input(...)
  .query(async ({ ctx, input }) => {
    const summaryOnly = input?.summary ?? false;

    if (summaryOnly) {
      // ... existing summary logic
    }

    // Try Drizzle relational API
    try {
      const links = await ctx.db.query.link.findMany({
        with: {
          source: true,
          target: true,
          linkName: true,
        },
        orderBy: [desc(link.createdAt)],
      });
      return links;
    } catch (error: unknown) {
      // Only catch specific Drizzle relation errors
      if (!isDrizzleRelationError(error)) {
        // Re-throw unexpected errors
        logServiceError(error, "link.getAll", { 
          summary: summaryOnly,
          unexpectedError: true 
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to load links: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }

      // Use fallback for expected Drizzle relation errors
      logServiceError(error, "link.getAll", { 
        summary: summaryOnly,
        fallbackUsed: true,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      });

      try {
        // Optimized batched fallback
        const linksData = await ctx.db
          .select()
          .from(link)
          .orderBy(desc(link.createdAt));

        if (linksData.length === 0) {
          return [];
        }

        // ... batched loading logic ...

        return linksData.map(l => ({
          ...l,
          source: sourceMap.get(l.sourceId) || null,
          target: targetMap.get(l.targetId) || null,
          linkName: linkNameMap.get(l.linkNameId) || null,
        }));
      } catch (fallbackError: unknown) {
        // Both paths failed
        logServiceError(fallbackError, "link.getAll.fallback", { 
          originalError: error instanceof Error ? error.message : "Unknown",
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to load links: both primary and fallback paths failed",
        });
      }
    }
  }),
```
