# Architecture Review: Testing tRPC Components

**Date:** 2025-12-15  
**Status:** Critical Issues Identified

## Executive Summary

We have a **fundamental architectural conflict** in our testing approach that prevents component integration tests from working. The issue is not with the code being tested, but with how we're attempting to test it.

## Critical Problems

### Problem 1: Mocking Conflict with Provider

**The Conflict:**
- `test-wrapper.tsx` imports `api` from `~/lib/trpc/react` and uses `api.Provider`
- Test files completely mock `api` via `jest.mock("~/lib/trpc/react")`
- The mock replaces `api.Provider` with a no-op: `({ children }) => <>{children}</>`
- This means React Query context is **never actually provided**
- Components can't use tRPC hooks properly because there's no QueryClient context

**Evidence:**
```typescript
// test-wrapper.tsx line 11
import { api } from "~/lib/trpc/react";

// test-wrapper.tsx line 57
<api.Provider client={trpcClient} queryClient={queryClient}>

// CapsulesTab.test.tsx line 99
TRPCReactProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
```

**Why ConceptCandidateList tests "work":**
- They only test UI rendering, not actual hook behavior
- The component renders because props are passed directly
- The `useMutation` hook is mocked to return `{ mutate: jest.fn() }` but it's never actually called in those tests
- They're essentially testing pure UI, not integration

### Problem 2: Mocking React Hooks as Plain Functions

**The Issue:**
- `useMutation` is a React hook that requires React's context system
- We're mocking it as a plain function: `jest.fn(() => ({ mutate: ... }))`
- This breaks React's rules of hooks and the component lifecycle
- The mock returns a static object, not a reactive hook that updates on state changes

**Why This Matters:**
- React Query hooks manage internal state (isPending, isSuccess, etc.)
- When we mock them as plain functions, that state never updates
- Components that rely on `isPending` or other reactive state won't work correctly

### Problem 3: Testing at the Wrong Abstraction Level

**What We're Trying to Test:**
- User clicks "Create Capsule" button
- Form submission triggers `createCapsuleMutation.mutate()`
- Mutation executes and calls `onSuccess`
- Component state updates

**What We're Actually Testing:**
- Nothing meaningful - the mock never gets called because the hook isn't actually running

**The Right Approach:**
- Test user interactions and component behavior
- Mock at the network/API layer, not the hook layer
- Or accept that this is an integration test and use a real tRPC client

## Root Cause Analysis

### Why This Approach Was Chosen

Looking at `ConceptCandidateList.test.tsx`, it seems we copied a pattern that worked for **pure UI components** and tried to apply it to **integration tests**. The key difference:

- **ConceptCandidateList**: Takes props, displays them, handles click events → pure UI logic
- **CapsulesTab**: Uses hooks, manages server state, handles async operations → integration logic

### The Kludge

The "kludge" is trying to have both:
1. A real `TestWrapper` that provides React Query context
2. A completely mocked `api` object that replaces all hooks

These are **incompatible**. You can't provide React Query context if you've replaced the Provider with a no-op.

## Recommended Solutions

### Option 1: Use MSW (Mock Service Worker) - RECOMMENDED

**Approach:** Mock at the HTTP/network layer, not the hook layer

**Benefits:**
- Real React Query context works normally
- Real tRPC hooks execute normally
- Tests actually verify the integration
- More maintainable - mocks match API contract

**Implementation:**
```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const server = setupServer(
  http.post('/api/trpc/capsule.create', () => {
    return HttpResponse.json({
      result: { data: { id: 'test-id', title: 'Test' } }
    })
  })
)

// In test setup
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**Pros:**
- Tests real integration
- No hook mocking needed
- Works with actual React Query context
- Industry best practice

**Cons:**
- Requires MSW setup
- Need to understand tRPC's HTTP format
- Slightly more setup

### Option 2: Test with Real tRPC Client (Integration Tests)

**Approach:** Use a real tRPC client pointing to a test server or in-memory handler

**Benefits:**
- True integration testing
- No mocking complexity
- Tests the full stack

**Cons:**
- Requires test database/server setup
- Slower tests
- More complex test environment

### Option 3: Component-Level Unit Tests (Current Direction, But Fix It)

**Approach:** Extract business logic from components, test that separately

**Changes Needed:**
- Don't test form submission → mutation flow in component tests
- Test form validation, state management, UI interactions separately
- Test mutation logic in router/service tests (already done)

**Example:**
```typescript
// Test that form validates correctly
it('shows error when title is empty', () => {
  // Test validation logic
})

// Test that mutate is called (if you must)
it('calls mutate with correct data', () => {
  const mockMutate = jest.fn()
  // Pass mockMutate as prop or via context
  // Test that it's called correctly
})
```

**Pros:**
- Fast tests
- Focused on component concerns
- Less brittle

**Cons:**
- Doesn't test full integration
- Requires refactoring components to accept mutation functions as props/context

### Option 4: Fix Current Approach (Not Recommended)

**What Would Need to Change:**
1. Don't mock the entire `api` object
2. Only mock specific hooks: `api.capsule.create.useMutation`
3. Keep `api.Provider` real in tests
4. Use React Query's testing utilities to control hook behavior

**Why Not Recommended:**
- Fighting against React's hook system
- Very complex to get right
- Fragile and hard to maintain
- Goes against testing best practices

## Code Quality Assessment

### Components (Good)

The component code itself is **well-structured**:

- `CreateCapsuleForm.tsx`: Clean, follows React best practices
- Proper use of hooks
- Good separation of concerns
- No bugs in the actual component code

### Test Infrastructure (Problematic)

- `test-wrapper.tsx`: **Architecturally broken** - imports real `api` but tests mock it
- Hook mocking approach: **Fighting React's systems**
- Test structure: Good organization, wrong technique

## Recommendations

1. **Short Term (Fix Tests Now):**
   - Implement MSW-based mocking
   - Keep `TestWrapper` as-is but remove hook mocks
   - Let real hooks run with mocked HTTP responses

2. **Medium Term (Improve Architecture):**
   - Consider extracting mutation logic into custom hooks
   - Make components more testable by accepting callbacks as props
   - Separate "smart" components (with hooks) from "dumb" components (pure UI)

3. **Long Term (Best Practices):**
   - Use MSW for all API mocking
   - Write integration tests that test user flows end-to-end
   - Use unit tests for pure logic, integration tests for component behavior
   - Consider E2E tests for critical user flows

## Questions to Answer

1. **What are we actually trying to verify?**
   - That the form submits correctly? → Test router/service layer
   - That the UI updates on success? → Use MSW + real hooks
   - That the button is disabled when loading? → Test component state directly

2. **Is this the right level of testing?**
   - Component tests: Fast, isolated, focused
   - Integration tests: Slower, realistic, comprehensive
   - E2E tests: Slowest, most realistic, full stack

3. **What's the cost/benefit?**
   - Current approach: High cost (complex mocks), low benefit (tests don't work)
   - MSW approach: Medium cost (setup), high benefit (working tests)
   - Real client approach: High cost (infrastructure), highest benefit (confidence)

## Conclusion

**The code being tested is fine. The testing approach is fundamentally flawed.**

We're trying to mock React hooks while simultaneously providing React context for them. This is like trying to drive a car while replacing the engine with a static mock - it won't work.

**Recommendation: Implement MSW-based testing immediately.** This is the industry-standard approach for testing React components that use data fetching libraries.

