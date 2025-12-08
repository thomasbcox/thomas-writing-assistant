# Code Improvement Plan

## Overview

This document outlines a systematic plan to fix code quality issues identified in the audit and establish automated quality checks.

## Phase 1: Fix Critical TypeScript Errors (Priority 1)

### 1.1 Fix Prisma Type Imports

**Issue**: Prisma types not being imported correctly

**Files to Fix:**
- `src/components/CapsulesTab.tsx`
- `src/server/api/routers/concept.ts`
- `src/server/api/routers/linkName.ts`
- `src/server/db.ts`
- `src/server/services/linkProposer.ts`

**Solution**: 
- Regenerate Prisma client: `npx prisma generate`
- Import types from `@prisma/client` correctly
- Use type re-exports from `~/types/database` where appropriate

### 1.2 Fix Implicit 'any' Types

**Files to Fix:**
- `src/components/AnchorEditor.tsx` - Add types for `c` and `a` parameters
- `src/components/CapsulesTab.tsx` - Add types for `anchor`, `acc`, `item` parameters
- `src/components/LinksTab.tsx` - Replace `any` with `ConceptListItem`
- `src/server/api/routers/link.ts` - Add type for `ln` parameter
- `src/server/api/routers/linkName.ts` - Add types for `ln` parameters
- `src/server/services/linkProposer.ts` - Add types for parameters

**Solution**: Add explicit type annotations using proper types from Prisma or custom types

### 1.3 Fix Test Type Errors

**Files to Fix:**
- `src/test/components/CapsulesTab.test.tsx` - Fix mock types and jest-dom matchers

**Solution**: 
- Import jest-dom matchers properly
- Fix mock function types
- Ensure test setup file is loaded

## Phase 2: Replace Console Statements (Priority 1)

### 2.1 Replace console.error with logger

**Files:**
- `src/components/ErrorBoundary.tsx`
- `src/components/TextInputTab.tsx`
- `src/components/PDFUploader.tsx`
- `src/components/ConceptCandidateList.tsx`

**Solution**: Import logger and use `logger.error()` instead

### 2.2 Replace console.warn with logger

**Files:**
- `src/server/services/llm/providers/gemini.ts`

**Solution**: Use `logger.warn()` instead

## Phase 3: Add Safe JSON Parsing (Priority 1)

### 3.1 Create JSON Parsing Utility

**Create**: `src/lib/json-utils.ts`

```typescript
export function safeJsonParse<T>(json: string | null, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.error({ error, json }, "Failed to parse JSON");
    return defaultValue;
  }
}
```

### 3.2 Replace All JSON.parse() Calls

**Files to Update:**
- `src/components/CapsulesTab.tsx`
- `src/components/AnchorEditor.tsx`
- `src/server/api/routers/capsule.ts`
- All other files with JSON.parse()

## Phase 4: Component Refactoring (Priority 2)

### 4.1 Split CapsulesTab Component

**Break into:**
- `CapsulesTab.tsx` - Main orchestrator
- `CapsuleInfoSection.tsx` - Info/help section
- `CapsuleUploadForm.tsx` - PDF upload form
- `CapsuleCreateForm.tsx` - Create capsule form
- `CapsuleList.tsx` - Capsule list display
- `AnchorCard.tsx` - Individual anchor display
- `DerivativeList.tsx` - Derivative content display

**Target**: Each component < 300 lines

## Phase 5: Error Handling Improvements (Priority 2)

### 5.1 Standardize Error Handling

**Create**: `src/lib/error-handling.ts`

- Standard error types
- Error formatting utilities
- User-friendly error messages

### 5.2 Add Error Boundaries

**Add error boundaries to:**
- Each major tab component
- Critical form components
- LLM interaction components

## Phase 6: Automated Quality Checks (Priority 1)

### 6.1 Enhanced ESLint Configuration

**Add rules:**
- `@typescript-eslint/no-explicit-any`: "error"
- `@typescript-eslint/no-unsafe-assignment`: "warn"
- `@typescript-eslint/no-unsafe-call`: "warn"
- `@typescript-eslint/no-unsafe-member-access`: "warn"
- `no-console`: ["error", { "allow": [] }] (remove console allow)
- `@typescript-eslint/explicit-function-return-type`: "warn"

### 6.2 Pre-commit Hooks

**Setup Husky + lint-staged:**
- Run ESLint on staged files
- Run TypeScript type check
- Run tests for changed files
- Format code with Prettier (if added)

### 6.3 CI/CD Checks

**Add GitHub Actions or similar:**
- Type check on every PR
- Lint check on every PR
- Test suite on every PR
- Build check on every PR

### 6.4 Type Coverage Tool

**Add `type-coverage`:**
- Track type coverage percentage
- Fail build if coverage drops
- Report in CI/CD

## Phase 7: Code Quality Improvements (Priority 3)

### 7.1 Extract Constants

**Create**: `src/lib/constants.ts`

- Timeout values
- File size limits
- Default values
- Error messages

### 7.2 Add JSDoc Comments

**Add to:**
- All public API functions
- Complex business logic
- Service layer functions
- Utility functions

### 7.3 Improve Input Validation

**Enhance Zod schemas:**
- Add more specific validations
- Add custom error messages
- Add sanitization where needed

## Implementation Timeline

### Week 1: Critical Fixes
- ✅ Fix all TypeScript type errors
- ✅ Replace console statements
- ✅ Add safe JSON parsing

### Week 2: Automation Setup
- ✅ Enhanced ESLint config
- ✅ Pre-commit hooks
- ✅ CI/CD checks

### Week 3: Refactoring
- ✅ Split large components
- ✅ Add error boundaries
- ✅ Standardize error handling

### Week 4: Polish
- ✅ Extract constants
- ✅ Add JSDoc
- ✅ Improve validation

## Success Metrics

- **TypeScript Errors**: 0
- **'any' Types**: 0 (except in tests where necessary)
- **Console Statements**: 0 (except in tests)
- **Unsafe JSON Parsing**: 0
- **Component Size**: All < 500 lines
- **Type Coverage**: > 90%
- **ESLint Errors**: 0
- **Test Coverage**: Maintain > 40%

