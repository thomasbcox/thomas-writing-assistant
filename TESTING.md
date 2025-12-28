# Testing

## Test Setup

The project uses **Jest** for testing with full ESM support. Tests are located in `src/test/`.

### Jest Configuration for TypeScript ESM

Jest is configured to handle TypeScript ESM modules with `.js` extensions in import statements (required by ESM):

- **Relative Import Mapping**: `moduleNameMapper` includes `'^(\\.{1,2}/.*)\\.js$': '$1'` to strip `.js` extensions from relative imports, allowing Jest to resolve them to `.ts` source files
- **Electron Support**: `electron/` directory is included in Jest `roots` for proper module resolution
- **ESM Support**: Uses `ts-jest/presets/default-esm` preset with `useESM: true`

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run build integration tests (requires npm run build:electron first)
npm run test:build

# Run all tests including build tests
npm run test:all
```

## Test Structure

- `src/test/test-utils.ts` - Test utilities (database setup, IPC caller creation)
- `src/test/*.test.ts` - Test files for services and IPC handlers
- `src/test/build/*.test.ts` - Build integration tests (verify compiled code)

## Test Utilities

The test utilities provide:

- `createTestDb()` - Creates an in-memory SQLite database for fast, isolated tests
- `createTestCaller(testDb)` - Creates an IPC caller with the test database
- `cleanupTestData(db)` - Cleans up test data from the database
- `migrateTestDb(db)` - Initializes the database schema for in-memory databases

## Test Categories

### Unit Tests
- **Service Layer Tests** - Test business logic in isolation
- **IPC Handler Tests** - Test Electron IPC handlers with mocked database
- **Component Tests** - Test React components with mocked IPC

### Integration Tests
- **Build Integration Tests** - Verify compiled Electron code can be loaded
  - Located in `src/test/build/`
  - Catch module resolution issues before runtime
  - Verify import paths are correctly transformed
  - Ensure path aliases are resolved to relative paths

## Build Integration Tests

The build integration tests (`src/test/build/`) are critical for catching module resolution issues that would only appear at runtime:

### What They Test

1. **Build Output Verification**
   - Required files exist in `dist-electron/`
   - Build artifacts are generated correctly

2. **Import Path Verification**
   - `../src/` imports are transformed to `./src/`
   - Path aliases (`~/`) are converted to relative paths
   - All relative imports have `.js` extensions (required for ESM)

3. **Module Loading Tests**
   - Compiled modules can be imported without resolution errors
   - No broken import paths in the compiled output

4. **Build Script Verification**
   - `fix-electron-imports.mjs` script runs successfully
   - Import paths are correctly transformed by the build script

### Running Build Tests

```bash
# First, build the Electron code
npm run build:electron

# Then run the build tests
npm run test:build
```

These tests will catch issues like:
- Incorrect import paths (e.g., `../src/` instead of `./src/`)
- Path alias resolution failures (e.g., `~/` not converted)
- Missing `.js` extensions on ESM imports
- Circular dependency issues
- Missing or incorrectly resolved dependencies

## Writing Tests

Example test structure:

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  createTestDb,
  createTestCaller,
  cleanupTestData,
  migrateTestDb,
} from "./test-utils";

describe("Router Name", () => {
  const db = createTestDb();
  const caller = createTestCaller(db);

  beforeAll(async () => {
    await migrateTestDb(db);
  });

  beforeEach(async () => {
    await cleanupTestData(db);
  });

  afterAll(async () => {
    await cleanupTestData(db);
    await db.$disconnect();
  });

  test("should do something", async () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

## Test Coverage

Current test status:
- ✅ **209 tests** passing across **26 test suites**
- ✅ Build integration tests verify compiled code integrity
- ✅ Concept Router - Full CRUD operations, trash/restore, search, links, purgeTrash
- ✅ Link Router - Link creation, retrieval, deletion, bidirectional links, updates
- ✅ LinkName Router - CRUD operations, default/custom names, usage tracking, edge cases
- ✅ Capsule Router - Capsule CRUD, anchors, repurposed content
- ✅ AI Router - Settings management, provider switching
- ✅ PDF Router - Text extraction, error handling

## CI/CD Integration

Build integration tests should be run in CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Build Electron
  run: npm run build:electron

- name: Run Build Tests
  run: npm run test:build
```

This ensures that any changes to build scripts or import paths are caught before deployment.
