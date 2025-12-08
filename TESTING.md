# Testing

## Test Setup

The project uses **Jest** for testing with full Prisma 7 support. Tests are located in `src/test/`.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `src/test/test-utils.ts` - Test utilities (database setup, tRPC caller creation)
- `src/test/*.test.ts` - Test files for tRPC routers

## Test Utilities

The test utilities provide:

- `createTestDb()` - Creates an in-memory SQLite database for fast, isolated tests
- `createTestCaller(testDb)` - Creates a tRPC caller with the test database
- `cleanupTestData(db)` - Cleans up test data from the database
- `migrateTestDb(db)` - Initializes the database schema for in-memory databases

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
- ✅ **105 tests** passing across **13 test suites**
- ✅ **0 failures** - All tests stable
- ✅ Concept Router - Full CRUD operations, trash/restore, search, links, purgeTrash
- ✅ Link Router - Link creation, retrieval, deletion, bidirectional links, updates
- ✅ LinkName Router - CRUD operations, default/custom names, usage tracking, edge cases
- ✅ Capsule Router - Capsule CRUD, anchors, repurposed content
- ✅ AI Router - Settings management, provider switching
- ✅ PDF Router - Text extraction, error handling
- ✅ Logger - 100% coverage
- ✅ Config Loader - Configuration management
- ✅ LLM Client - Multi-provider support (OpenAI/Gemini)
- ✅ Service Error Logging - Error handling verification
- ✅ Tailwind CSS - Configuration and build verification
- ✅ tRPC Configuration - Context and error formatting

### Coverage by Area

- **Routers**: 97.1% coverage (excellent)
- **Logger**: 100% coverage (complete)
- **Test Utils**: Well tested
- **Services**: 33.55% coverage (LLM services require API keys or mocks)
- **PDF Processing**: Tested and working

### Test Statistics

- **Total Tests**: 105 (all passing)
- **Test Suites**: 13 (all passing)
- **Test Time**: ~3-4 seconds

## Configuration

Jest is configured in `jest.config.js` with:
- TypeScript support via `ts-jest`
- ESM module support
- Prisma 7 compatibility via module mapping
- Path aliases (`~/*` → `src/*`)

## Notes

- Tests use in-memory SQLite databases for speed and isolation
- Each test suite gets a fresh database instance
- Tests automatically clean up data between runs
- Prisma 7 compatibility is handled via Jest's moduleNameMapper
