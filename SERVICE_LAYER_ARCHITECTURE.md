# Service Layer Architecture Analysis

> **⚠️ NOTE: This document has been updated to reflect the current Electron + IPC architecture. The service layer structure remains similar, but the API layer has changed from tRPC to IPC handlers.**

## Architecture Overview

The service layer follows a **layered architecture pattern** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│   IPC Handlers (API Layer)           │  ← IPC interface (Electron)
│   - concept-handlers.ts             │
│   - link-handlers.ts                │
│   - capsule-handlers.ts             │
│   - ai-handlers.ts                  │
└──────────────┬──────────────────────┘
               │ calls
               ▼
┌─────────────────────────────────────┐
│   Service Layer (Business Logic)     │  ← Core functionality
│   - conceptProposer.ts              │
│   - linkProposer.ts                 │
│   - repurposer.ts                   │
│   - llm/client.ts                   │
│   - config.ts                       │
└──────────────┬──────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────┐
│   Infrastructure Layer               │
│   - Database (Drizzle ORM + SQLite)  │
│   - OpenAI/Gemini API                │
│   - File System (config files)      │
│   - Logger (Pino)                    │
└─────────────────────────────────────┘
```

## Service Layer Components

### 1. **LLM Services** (AI-Powered)
These services orchestrate LLM calls to generate content:

#### `conceptProposer.ts` (0% coverage)
- **Purpose**: Extract concepts from text using AI
- **Dependencies**: `LLMClient`, `ConfigLoader`
- **Key Function**: `generateConceptCandidates()`
- **Flow**:
  1. Gets LLM client and config loader (singletons)
  2. Truncates text to 10,000 chars
  3. Builds system prompt from config
  4. Calls `llmClient.completeJSON()` with prompt
  5. Parses JSON response
  6. Returns concept candidates array
  7. On error: logs and returns empty array

#### `linkProposer.ts` (0% coverage)
- **Purpose**: Propose semantic links between concepts using AI
- **Dependencies**: `db`, `LLMClient`, `ConfigLoader`
- **Key Function**: `proposeLinksForConcept()`
- **Flow**:
  1. Fetches source concept from DB
  2. Gets existing links to avoid duplicates
  3. Fetches candidate concepts (excludes already-linked)
  4. Calls internal `proposeLinksWithLLM()` function
  5. LLM analyzes relationships and proposes links
  6. Enriches proposals with target titles
  7. Sorts by confidence
  8. On error: logs and returns empty array

#### `repurposer.ts` (0% coverage)
- **Purpose**: Repurpose anchor content into multiple formats
- **Dependencies**: `LLMClient`, `ConfigLoader`
- **Key Function**: `repurposeAnchorContent()`
- **Flow**:
  1. Gets LLM client and config loader
  2. Builds system prompt for repurposing
  3. Formats pain points and solution steps
  4. Calls `llmClient.completeJSON()` with structured prompt
  5. Parses response into different content types
  6. Returns array of `RepurposedContent` objects
  7. On error: logs and returns empty array

### 2. **Infrastructure Services**

#### `llm.ts` (44% coverage)
- **Purpose**: Wrapper around OpenAI API
- **Pattern**: Singleton class
- **Key Methods**:
  - `complete()`: Text completion
  - `completeJSON()`: JSON-structured completion
- **Dependencies**: OpenAI SDK, environment variables

#### `config.ts` (76.47% coverage)
- **Purpose**: Load and manage YAML config files
- **Pattern**: Singleton class
- **Key Methods**:
  - `getStyleGuide()`: Writing style preferences
  - `getCredo()`: Core beliefs/values
  - `getConstraints()`: Hard rules
  - `getSystemPrompt()`: Builds combined prompt
- **Dependencies**: File system, YAML parser

## Why Testing Coverage is Weak

### 1. **External API Dependencies**

**Problem**: Services depend on OpenAI API calls
- Real API calls are:
  - **Slow** (seconds per call)
  - **Expensive** (costs money)
  - **Unreliable** (network issues, rate limits)
  - **Non-deterministic** (different responses each time)

**Current State**: No mocking of OpenAI client
- Tests would need real API keys
- Tests would be slow and flaky
- Tests would cost money

**Solution Needed**: Mock `LLMClient` in tests

### 2. **Database Dependencies**

**Problem**: Services like `linkProposer.ts` directly use `db` (Drizzle ORM instance)
- Requires database setup
- Needs test data
- Complex queries with multiple joins

**Current State**: 
- Test utilities exist (`createTestDb()`) and services can use in-memory databases
- Services use `getDb()` or `getCurrentDb()` which supports test database injection

**Solution Needed**: Dependency injection pattern

### 3. **Singleton Pattern**

**Problem**: Services use singleton pattern (`getLLMClient()`, `getConfigLoader()`)
- Hard to mock in tests
- State persists between tests
- Can't easily swap implementations

**Example**:
```typescript
// Hard to test - singleton
const llmClient = getLLMClient();

// Better - dependency injection
function generateConcepts(llmClient: LLMClient, ...) { }
```

**Solution Needed**: Accept dependencies as parameters

### 4. **File System Dependencies**

**Problem**: `config.ts` reads from file system
- Requires actual YAML files to exist
- File paths are hardcoded
- Can't easily test different config scenarios

**Current State**: Tests exist but don't cover all edge cases

**Solution Needed**: More comprehensive file system mocking

### 5. **Error Handling is Silent**

**Problem**: Services catch errors and return empty arrays
- Makes it hard to test error scenarios
- Errors are logged but not thrown
- Can't verify error handling without checking logs

**Example**:
```typescript
try {
  // ... LLM call
} catch (error) {
  logServiceError(error, "service", context);
  return []; // Silent failure
}
```

**Solution Needed**: 
- Option to throw errors in test mode
- Or verify error logging in tests

### 6. **Complex Prompt Building**

**Problem**: Services build complex prompts dynamically
- Hard to verify prompt correctness
- Prompts depend on config files
- Multiple conditional branches

**Example**:
```typescript
const systemPrompt = configLoader.getSystemPrompt(
  "You are analyzing text..."
);
const prompt = `Analyze the following text...
${textToAnalyze}
${instructionText}
...`;
```

**Solution Needed**: Extract prompt building to testable functions

### 7. **JSON Parsing Edge Cases**

**Problem**: Services parse JSON from LLM responses
- LLM might return invalid JSON
- Missing fields
- Wrong types
- Malformed structures

**Current State**: No tests for parsing edge cases

**Solution Needed**: Test various JSON response formats

## Testing Challenges Summary

| Service | Coverage | Main Challenge |
|---------|----------|----------------|
| `conceptProposer.ts` | 0% | OpenAI API mocking, prompt validation |
| `linkProposer.ts` | 0% | Database queries, LLM mocking, complex logic |
| `repurposer.ts` | 0% | OpenAI API mocking, JSON parsing |
| `llm.ts` | 44% | OpenAI SDK mocking, error scenarios |
| `config.ts` | 76% | File system edge cases |

## Recommended Testing Strategy

### 1. **Mock External Dependencies**
```typescript
// Mock LLM client
jest.mock("~/server/services/llm", () => ({
  getLLMClient: () => ({
    completeJSON: jest.fn().mockResolvedValue({ concepts: [...] })
  })
}));
```

### 2. **Dependency Injection**
```typescript
// Instead of:
export async function generateConceptCandidates(...) {
  const llmClient = getLLMClient(); // ❌ Hard to test
  
// Do:
export async function generateConceptCandidates(
  llmClient: LLMClient, // ✅ Easy to mock
  ...
) { }
```

### 3. **Test Utilities**
- Create test database instances
- Mock file system operations
- Provide test configs

### 4. **Test Error Scenarios**
- Mock LLM to throw errors
- Verify error logging
- Test empty/invalid responses

### 5. **Integration Tests**
- Test full flow with mocked LLM
- Verify database interactions
- Test prompt building

## Current Architecture Strengths

✅ **Clear separation of concerns**
✅ **Consistent error handling pattern**
✅ **Good logging integration**
✅ **Type-safe interfaces**

## Architecture Weaknesses for Testing

❌ **Tight coupling to singletons**
❌ **No dependency injection**
❌ **Hard to mock external APIs**
❌ **Silent error handling**

## Conclusion

The service layer has **weak test coverage because**:

1. **External dependencies** (OpenAI API) are hard to mock
2. **Singleton pattern** makes dependency injection difficult
3. **Direct database access** requires complex test setup
4. **Silent error handling** makes error scenarios hard to test
5. **Complex prompt building** is hard to verify

**The architecture is functional but not test-friendly.** To improve coverage, we need to:
- Add dependency injection
- Mock external APIs
- Create comprehensive test utilities
- Test error scenarios explicitly

