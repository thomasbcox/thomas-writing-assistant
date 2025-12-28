# Debug Analysis: IPC Handler Test Database Issue

## Problem Statement

IPC handler tests are failing with `SqliteError: no such table: Concept`. The tests create a test database and migrate it, but when handlers execute, they cannot find the tables.

## Key Observations

1. **Module-Level Code Execution**: `electron/main.ts` has module-level code that executes on import:
   - Line 63-75: `app.whenReady().then(() => { initializeDatabase(); ... })`
   - Line 109: `registerAllHandlers()` - called at module level

2. **Handler Registration**: When `registerConceptHandlers()` is called, it imports `getDb` from `../main.js`, which causes `electron/main.ts` to execute.

3. **Database Initialization**: `electron/main.ts` initializes a real database file, not our test database.

4. **Mock Setup**: We mock `getDb` but the mock may not be applied correctly before the handlers are registered.

## Hypotheses to Test

### Hypothesis A: Mock Not Applied Before Handler Registration
- **Theory**: `getDb` mock is not applied before `registerConceptHandlers()` imports and uses `getDb`
- **Test**: Log when mock is set up vs when handlers are registered
- **Evidence needed**: Mock setup timestamp vs handler registration timestamp

### Hypothesis B: Database Migration Not Completing
- **Theory**: `migrateTestDb()` is not actually creating tables in the test database
- **Test**: Verify tables exist after migration, before handler execution
- **Evidence needed**: Table count/names after migration

### Hypothesis C: Wrong Database Instance Used
- **Theory**: Handlers are using a different database instance than the one we migrated
- **Test**: Log database instance identity at migration time vs handler execution time
- **Evidence needed**: Database object references/identifiers

### Hypothesis D: Module-Level Code Interference
- **Theory**: `electron/main.ts` module-level code executes and interferes with test setup
- **Test**: Check if `registerAllHandlers()` or `initializeDatabase()` executes during tests
- **Evidence needed**: Logs from main.ts execution, handler registration counts

### Hypothesis E: Async Timing Issue
- **Theory**: Handlers execute before database migration completes
- **Test**: Verify migration completion before handler registration
- **Evidence needed**: Migration completion flag, handler execution timestamps

