# Comprehensive Test Plan

## Overview

Fresh test suite based on system requirements and testing best practices for the Electron + IPC architecture.

## Architecture

- **IPC Handlers**: Server-side handlers in `electron/ipc-handlers/` that process requests
- **IPC Client**: Client library in `src/lib/ipc-client.ts` that communicates with handlers
- **React Components**: UI components that use IPC client via `api` object from `useIPC` hook
- **Services**: Business logic in `src/server/services/`

## Test Categories

### 1. IPC Handler Tests ✅ Priority 1

**Location**: `src/test/ipc-handlers/`

**Strategy**:
- Use in-memory SQLite database via `test-utils.ts`
- Mock `getDb()` from `electron/main.js` to return test database
- Mock external dependencies (LLM client, config loader, PDF parser)
- Register handlers before each test
- Test all handler methods with valid inputs, invalid inputs, and error cases

**Files to Create**:
1. `concept-handlers.test.ts` - Test all concept operations
2. `link-handlers.test.ts` - Test link operations  
3. `linkName-handlers.test.ts` - Test link name operations
4. `capsule-handlers.test.ts` - Test capsule operations
5. `pdf-handlers.test.ts` - Test PDF extraction
6. `ai-handlers.test.ts` - Test AI settings
7. `config-handlers.test.ts` - Test config operations

### 2. Component Tests ✅ Priority 2

**Location**: `src/test/components/`

**Strategy**:
- Mock `window.electronAPI` with Jest
- Use React Testing Library for component testing
- Test rendering, user interactions, data loading, error states

**Files to Create**:
1. `Dashboard.test.tsx` - Main dashboard component
2. `ConceptsTab.test.tsx` - Concept management UI
3. `LinksTab.test.tsx` - Link management UI
4. `CapsulesTab.test.tsx` - Capsule content UI
5. `ConfigTab.test.tsx` - Configuration UI
6. `SettingsTab.test.tsx` - Settings UI
7. `TextInputTab.test.tsx` - Text input for concept generation
8. `PDFUploader.test.tsx` - PDF upload component
9. `LinkNameManager.test.tsx` - Link name management
10. `ConceptList.test.tsx` - Concept list display
11. `ConceptViewer.test.tsx` - Concept viewing
12. `ConceptEditor.test.tsx` - Concept editing
13. `ErrorBoundary.test.tsx` - Error boundary component

### 3. Service Tests ✅ Keep Existing

**Status**: Most service tests are passing - keep and enhance as needed

## IPC Handler Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// Mock getDb BEFORE any imports
jest.mock("../../../electron/main.js", () => ({
  __esModule: true,
  getDb: jest.fn(),
}));

import { createTestDb, migrateTestDb, cleanupTestData } from "../test-utils";
import { registerConceptHandlers } from "../../../electron/ipc-handlers/concept-handlers";
import { concept } from "~/server/schema";

describe("Concept IPC Handlers", () => {
  let testDb: ReturnType<typeof createTestDb>;
  const { getDb } = jest.requireMock("../../../electron/main.js");

  beforeEach(async () => {
    testDb = createTestDb();
    await migrateTestDb(testDb);
    getDb.mockReturnValue(testDb);
    registerConceptHandlers();
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
  });

  describe("concept:list", () => {
    it("should return empty array when no concepts exist", async () => {
      const { ipcMain } = await import("electron");
      const mockEvent = { sender: { send: jest.fn() } } as any;
      const handler = ipcMain.listeners("concept:list")[0] as any;
      const result = await handler(mockEvent, { includeTrash: false });
      expect(result).toEqual([]);
    });
    // ... more tests
  });
});
```

## Component Test Template

```typescript
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { ComponentTestWrapper } from "../utils/component-test-wrapper";
import { ConceptsTab } from "../../components/ConceptsTab";

// Mock IPC client
const mockElectronAPI = {
  concept: {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    // ... other methods
  },
};

beforeEach(() => {
  (global as any).window = {
    electronAPI: mockElectronAPI,
  };
  jest.clearAllMocks();
});

describe("ConceptsTab", () => {
  it("should render concepts tab", () => {
    mockElectronAPI.concept.list.mockResolvedValue([]);
    render(
      <ComponentTestWrapper>
        <ConceptsTab />
      </ComponentTestWrapper>
    );
    expect(screen.getByText(/concepts/i)).toBeInTheDocument();
  });
  // ... more tests
});
```

## Test Coverage Goals

### IPC Handlers
- ✅ All handler methods tested
- ✅ Valid inputs
- ✅ Invalid inputs (Zod validation)
- ✅ Error cases
- ✅ Edge cases

### Components  
- ✅ Rendering
- ✅ User interactions
- ✅ Data loading states
- ✅ Error states
- ✅ Success states

## Implementation Order

1. IPC Handler Tests (all 7 files)
2. Component Tests (priority components first)
3. Enhance existing service tests if needed
