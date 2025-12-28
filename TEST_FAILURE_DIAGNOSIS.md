# Test Failure Diagnosis - IPC Handler Tests

**Date**: January 2025  
**Status**: Diagnosis Complete - Approach Suggested

## Current Test Status

- **Total Tests**: 22
- **Passing**: 5 (validation schema tests)
- **Failing**: 17 (all database operation tests)

## Root Cause Analysis

### Problem 1: Mock Not Returning Test Database

**Error Pattern**:
```
TypeError: Cannot read properties of undefined (reading 'session')
at cleanupTestData (src/test/test-utils.ts:38:12)
```

**What's Happening**:
1. The `jest.mock("../../../electron/db.js")` is correctly set up to replace the module
2. In `beforeEach`, we call `(getDb as jest.Mock).mockReturnValue(testDb)`
3. However, when handlers call `getDb()`, it returns `undefined` instead of `testDb`

**Why This Happens**:
- When we import `getDb` from the mocked module, Jest creates a new mock function
- The `(getDb as jest.Mock)` cast doesn't actually give us access to the same mock instance
- We're trying to configure a different mock function than the one being used by handlers

### Problem 2: Mock Configuration Timing

The mock is configured in `beforeEach`, but handlers might be importing `getDb` at module load time, creating a closure over the initial (unconfigured) mock.

### Evidence from Logs

- Tests that only validate input schemas (don't call `getDb()`) pass ✅
- All tests that actually use the database fail ❌
- The error shows `undefined` is being returned from `getDb()` calls

## Suggested Approach

### Option 1: Use `jest.mocked()` Utility (Recommended)

**How it works**:
- `jest.mocked()` is a TypeScript-aware utility that ensures you're working with the actual mocked function
- It provides proper type safety and guarantees access to the mock methods

**Implementation**:
```typescript
import { jest, jest as jestType } from "@jest/globals";
import { getDb } from "../../../electron/db.js";

// In beforeEach:
jest.mocked(getDb).mockReturnValue(testDb);
```

**Pros**:
- Type-safe
- Guaranteed to work with the actual mock instance
- Clean and idiomatic Jest approach

**Cons**:
- Requires importing the mocked function (which is fine since it's mocked)

### Option 2: Access Mock via `jest.requireMock()`

**How it works**:
- Use `jest.requireMock()` to get direct access to the mocked module
- Configure the mock through the module object

**Implementation**:
```typescript
const mockDbModule = jest.requireMock("../../../electron/db.js");

// In beforeEach:
mockDbModule.getDb.mockReturnValue(testDb);
```

**Pros**:
- Direct access to mock functions
- No import needed

**Cons**:
- Less type-safe
- More verbose

### Option 3: Use Module Factory Pattern with Shared Reference

**How it works**:
- Create a shared mock function reference outside the factory
- Use that reference in both the factory and test configuration

**Implementation**:
```typescript
const mockGetDbFn = jest.fn();
jest.mock("../../../electron/db.js", () => ({
  __esModule: true,
  getDb: mockGetDbFn,
  initDb: jest.fn(),
  closeDb: jest.fn(),
}));

// In beforeEach:
mockGetDbFn.mockReturnValue(testDb);
```

**Pros**:
- Single source of truth for the mock
- Clear and explicit

**Cons**:
- Requires careful hoisting (Jest hoists `jest.mock()` but variables need to be accessible)
- May have issues with ESM module resolution

## Recommended Solution

**Use Option 1 (`jest.mocked()`)**

This is the most robust and type-safe approach. It's the recommended Jest pattern for TypeScript projects with ESM modules.

### Implementation Steps:

1. **Import `getDb` after the mock declaration**:
   ```typescript
   jest.mock("../../../electron/db.js", () => ({
     __esModule: true,
     getDb: jest.fn(),
     initDb: jest.fn(),
     closeDb: jest.fn(),
   }));
   
   // Import after mock
   import { getDb } from "../../../electron/db.js";
   ```

2. **Use `jest.mocked()` in `beforeEach`**:
   ```typescript
   beforeEach(async () => {
     // ... setup code ...
     
     // Configure mock to return test database
     jest.mocked(getDb).mockReturnValue(testDb);
     
     // ... rest of setup ...
   });
   ```

3. **Clean up mocks in `afterEach`** (optional but recommended):
   ```typescript
   afterEach(async () => {
     jest.mocked(getDb).mockClear();
     // ... other cleanup ...
   });
   ```

## Why This Will Work

1. **`jest.mocked()` ensures type safety**: It knows `getDb` is a mock and provides correct types
2. **Direct reference to the mock instance**: `jest.mocked()` returns the actual mock function that Jest created
3. **Works with ESM**: This pattern works correctly with Jest's ESM support
4. **Clear and maintainable**: The code intent is obvious

## Additional Considerations

### Debug Log Cleanup
- Remove all the `#region agent log` debug statements after fixing the mocks
- They were added for debugging and are no longer needed

### Mock Reset Strategy
- Consider using `mockClear()` or `mockReset()` in `afterEach` to ensure clean state between tests
- `mockClear()` clears call history but keeps return values
- `mockReset()` clears everything including return values

## Next Steps

1. Implement `jest.mocked()` approach
2. Verify all tests pass
3. Remove debug logging statements
4. Run full test suite to ensure no regressions

