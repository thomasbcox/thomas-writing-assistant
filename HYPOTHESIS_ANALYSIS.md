# Hypothesis Analysis - IPC Handler Test Issue

## Log Evidence Summary

From analysis of 2,990 log entries:

### Hypothesis A: Mock Not Applied Before Handler Registration
**Status: REJECTED** 
- Logs show mocks are set up correctly
- Mock is applied in `beforeEach` before handler registration

### Hypothesis B: Database Migration Not Completing  
**Status: REJECTED**
- **Evidence**: Logs show `tableCount: 7, tableNames: ['Concept', 'LinkName', 'Link', 'Capsule', 'Anchor', 'RepurposedContent', 'MRUConcept']`
- Migration completes successfully, all tables are created

### Hypothesis C: Wrong Database Instance Used
**Status: CONFIRMED** ⚠️ **ROOT CAUSE**
- **Critical Evidence**: Logs show `electron/main.ts:98: getDb called`
- This means the REAL `getDb()` from `electron/main.ts` is executing, NOT the mock
- The real database instance (initialized at `/tmp/test-user-data/dev.db`) is being used instead of the test database

### Hypothesis D: Module-Level Code Interference
**Status: CONFIRMED** ⚠️ **ROOT CAUSE**
- **Evidence**: `registerConceptHandlers called` appears at timestamps BEFORE test `beforeEach` runs
- This indicates `electron/main.ts` executes module-level code (line 109: `registerAllHandlers()`) when imported
- The real module executes, causing real database initialization

### Hypothesis E: Async Timing Issue
**Status: REJECTED**
- Migration completes before handlers are registered
- Timing is correct

## Root Cause

**The real `electron/main.ts` module is executing when `registerConceptHandlers()` imports `getDb` from `../main.js`.**

When Jest's `jest.mock()` mocks a module, it replaces the exports but the module code STILL EXECUTES on import. This means:
1. `electron/main.ts` module-level code runs (line 109: `registerAllHandlers()`)
2. This calls `registerConceptHandlers()` which tries to use `getDb`
3. The REAL `getDb()` is used (not the mock) because the module is already executing
4. The real database (`/tmp/test-user-data/dev.db`) is initialized and used
5. This database has no tables, causing "no such table: Concept" errors

## Solution Options

### Option 1: Prevent Module Execution (Recommended)
Mock the entire `electron/main.ts` module BEFORE any handler imports it, preventing module-level code execution.

### Option 2: Refactor to Avoid Module-Level Side Effects
Move `registerAllHandlers()` call to a function that's called explicitly, not at module level.

### Option 3: Use Module Factory with Conditional Execution
Use a factory function in `electron/main.ts` that checks if we're in a test environment.

## Recommended Fix

**Option 1** is cleanest for testing: Ensure `jest.mock()` is hoisted and prevents module execution entirely.

