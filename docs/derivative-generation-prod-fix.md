# Derivative Generation Failure in PROD - Root Cause Analysis

**Date**: December 22, 2025  
**Last Updated**: December 22, 2025  
**Status**: ✅ Fixed

## Problem

Uploading an anchor post works in PROD, but generating derivative content fails. The issue occurs after switching from DEV to PROD database.

## Root Cause

The problem is a **stale database connection** issue. When `reconnectDatabase()` is called to switch from DEV to PROD:

1. The `reconnectDatabase()` function updates the module-level export: `(module as any).exports.db = newDb`
2. However, **ESM imports are cached** - any code that imported `db` directly still has a reference to the old database instance
3. The tRPC context (`src/server/api/trpc.ts`) was importing `db` directly, so it always used the initial database connection
4. When generating derivatives, the tRPC router uses `ctx.db`, which was pointing to the old (DEV) database
5. The anchor might exist in PROD, but the query was running against DEV, causing failures

## Solution

### 1. Created `getCurrentDb()` function

Added a getter function in `src/server/db.ts` that always returns the current database instance:

```typescript
export function getCurrentDb(): DatabaseInstance {
  // Check if we have a global instance (updated by reconnectDatabase)
  if (globalForDb.db) {
    return globalForDb.db;
  }
  // Fall back to module-level export
  return db;
}
```

### 2. Updated `getDb()` in API helpers

Modified `src/server/api/helpers.ts` to use `getCurrentDb()`:

```typescript
export function getDb() {
  return getCurrentDb();
}
```

### 3. Updated tRPC context

Fixed `src/server/api/trpc.ts` to use `getCurrentDb()` instead of importing `db` directly:

```typescript
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db: getCurrentDb(), // Always get current instance
    ...opts,
  };
};
```

### 4. Fixed global state management

Updated `initializeDatabase()` and `reconnectDatabase()` to always update global state (not just in non-production), ensuring `getCurrentDb()` works correctly.

## Test Coverage

Created `src/test/services/repurposer-prod.test.ts` to test:
- Anchor with JSON string pain points and solution steps (PROD scenario)
- Anchor with null pain points and solution steps
- Database connection issues when switching to PROD

All tests pass, confirming the fix works.

## Impact

- ✅ tRPC routes now use the current database instance after reconnection
- ✅ REST API routes already used `getDb()`, so they're fixed too
- ✅ Database switching now works correctly for all operations
- ✅ Derivative generation will work in PROD after database switch

## Additional Notes

- The issue only manifested in PROD because that's when users switch databases
- DEV worked fine because it was always using the initial database connection
- The fix ensures all database access goes through `getCurrentDb()`, which always returns the active database
