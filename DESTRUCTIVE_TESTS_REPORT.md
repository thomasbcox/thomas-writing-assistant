# Destructive Tests Report

## Summary

This report identifies tests that modify real files, databases, or production resources instead of using isolated test fixtures.

## ✅ Fixed Issues

### 1. `src/test/routers/config.test.ts` - **FIXED**
- **Problem**: Tests were writing directly to real config files (`config/style_guide.yaml`, `config/credo.yaml`, `config/constraints.yaml`)
- **Impact**: User's configuration edits were overwritten with test data
- **Fix Applied**: Added backup/restore logic that saves original files before tests and restores them after each test
- **Status**: ✅ Fixed

## ⚠️ Potentially Problematic Tests

### 2. `src/test/test-utils.ts` - Default Test Database Path
- **File**: `src/test/test-utils.ts`
- **Line**: 26
- **Issue**: `createTestDbFile()` defaults to `"./test.db"` in project root
- **Risk**: If cleanup fails, could leave test database files in project root
- **Current Behavior**: 
  - Uses in-memory database by default (`:memory:`) - ✅ Safe
  - File-based test DB only created when explicitly requested
  - Tests should clean up after themselves
- **Recommendation**: 
  - ✅ Already uses in-memory by default (safe)
  - ⚠️ Consider using `./test-db/` subdirectory for file-based tests
  - ⚠️ Add cleanup in `afterAll` hooks

### 3. `src/test/test-utils.test.ts` - Test Database Files in Root
- **File**: `src/test/test-utils.test.ts`
- **Lines**: 12, 33
- **Issue**: Creates `./test-file.db` and `./test-cleanup.db` in project root
- **Risk**: If test crashes or cleanup fails, files remain in project root
- **Current Behavior**: 
  - Has `afterAll` hook to clean up
  - But if test crashes before cleanup, files remain
- **Recommendation**: 
  - ✅ Has cleanup logic
  - ⚠️ Consider using `./test-db/` subdirectory
  - ⚠️ Add try/finally blocks for guaranteed cleanup

### 4. `src/test/pdf.test.ts` - Reads Real PDF File
- **File**: `src/test/pdf.test.ts`
- **Line**: 65
- **Issue**: Reads from `input/pdfs/The PRoPeLS Pattern.pdf` (real file)
- **Risk**: Low - only reads, doesn't modify
- **Current Behavior**: 
  - Only reads the file
  - Skips test if file doesn't exist
  - Doesn't modify the file
- **Recommendation**: 
  - ✅ Safe (read-only)
  - ⚠️ Consider using a dedicated test PDF in `test/fixtures/` directory

### 5. `src/test/tailwind.test.ts` - Reads Real Source Files
- **File**: `src/test/tailwind.test.ts`
- **Issue**: Reads from real source files (`src/styles/globals.css`, `postcss.config.js`, etc.)
- **Risk**: Low - only reads, doesn't modify
- **Current Behavior**: 
  - Only reads files to verify configuration
  - Doesn't modify any files
- **Recommendation**: 
  - ✅ Safe (read-only)
  - No changes needed

### 6. `src/test/config.test.ts` - Uses Test Config Directory
- **File**: `src/test/config.test.ts`
- **Line**: 8
- **Issue**: Creates `test-config` directory
- **Risk**: Low - uses dedicated test directory, not real config
- **Current Behavior**: 
  - Uses `test-config/` directory (separate from real `config/`)
  - Cleans up test files after each test
- **Recommendation**: 
  - ✅ Safe (uses test directory)
  - ⚠️ Consider cleaning up `test-config/` directory itself in `afterAll`

## ✅ Safe Tests

### Database Tests
- All router tests use `createTestDb()` which uses in-memory database (`:memory:`) - ✅ Safe
- All service tests use mocked dependencies - ✅ Safe
- Component tests use mocked tRPC - ✅ Safe

### File System Tests
- `tailwind.test.ts` - Only reads files - ✅ Safe
- `pdf.test.ts` - Only reads files - ✅ Safe
- `config.test.ts` - Uses test directory - ✅ Safe

## Recommendations

### High Priority
1. ✅ **DONE**: Fixed `config.test.ts` router to backup/restore real config files

### Medium Priority
2. **Improve test database cleanup**:
   - Use `./test-db/` subdirectory for all test database files
   - Add try/finally blocks in tests that create files
   - Add global `afterAll` hook to clean up any remaining test files

3. **Add test fixtures directory**:
   - Create `test/fixtures/` for test PDFs and other test data
   - Move PDF test to use fixture instead of real file

### Low Priority
4. **Add test isolation checks**:
   - Add a test that verifies no real files are modified
   - Add CI check to ensure tests don't leave artifacts

## Test Safety Checklist

When writing new tests, ensure:
- ✅ Use in-memory databases or test-specific files
- ✅ Use test directories (e.g., `test-config/`, `test-db/`)
- ✅ Clean up all created files in `afterAll` hooks
- ✅ Use try/finally for guaranteed cleanup
- ✅ Never write to real config files, `.env`, or production data
- ✅ Mock external services (APIs, file systems when possible)
- ✅ Use test fixtures instead of real data files

