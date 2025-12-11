# Testing

**Last Updated**: 2025-12-11

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
- ✅ **152 tests** passing across **18 test suites**
- ⚠️ **44 component tests** need tRPC provider setup improvements
- ✅ Concept Router - Full CRUD operations, trash/restore, search, links, purgeTrash
- ✅ Link Router - Link creation, retrieval, deletion, bidirectional links, updates
- ✅ LinkName Router - CRUD operations, default/custom names, usage tracking, edge cases
- ✅ Capsule Router - Capsule CRUD, anchors, repurposed content
- ✅ AI Router - Settings management, provider switching
- ✅ PDF Router - Text extraction, error handling
- ✅ Config Router - Configuration management with hot reload
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
- **Services**: Good coverage (LLM services use mocks for testing)
- **PDF Processing**: Tested and working
- **Components**: Basic unit tests passing, flow tests need tRPC provider setup

### Test Statistics

- **Total Tests**: 197 (152 passing, 44 component tests need setup, 1 skipped)
- **Test Suites**: 26 (18 passing, 7 component test suites need setup, 1 skipped)
- **Test Time**: ~6-8 seconds

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
