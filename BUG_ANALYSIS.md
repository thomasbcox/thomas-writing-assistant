# Bug Analysis and Fix Requirements

**Last Updated**: 2025-12-11

## Summary

**Total Test Failures**: 41 tests failing across 6 test suites
**Test Suites**: 25 passing, 6 failing, 1 skipped
**Individual Tests**: 215 passing, 41 failing

---

## Critical Production Bugs

### 1. Capsule Router - Prisma Client Infrastructure Issue

**Severity**: 🔴 **HIGH** (Blocks all capsule-related features)

**Issue**: 
```
ReferenceError: Must call super constructor in derived class before accessing 'this'
```

**Affected Operations**:
- Listing capsules with nested includes
- Getting capsule by ID with anchors
- Creating/updating/deleting repurposed content
- All operations using nested `include` queries

**Root Cause**: 
Prisma 7 + Better-SQLite3 adapter compatibility issue when using nested `include` queries in test environment. The Prisma client runtime is failing to properly instantiate query result objects when using nested includes.

**Impact if Unfixed**:
- **Production**: Capsule feature completely broken - users cannot:
  - View capsules with their anchors
  - Create or manage repurposed content
  - Use capsule content management features
  - This is a core feature of the application

**What's Needed to Fix**:
1. **Option A (Recommended)**: Update Prisma query patterns to avoid deeply nested includes
   - Flatten queries where possible
   - Use separate queries and combine results
   - Estimated effort: 2-4 hours
   
2. **Option B**: Wait for Prisma 7 + SQLite adapter fix
   - Monitor Prisma GitHub issues
   - May require Prisma version update
   - Estimated effort: Unknown (depends on Prisma team)

3. **Option C**: Switch to different SQLite adapter or Postgres
   - More significant architectural change
   - Requires migration planning
   - Estimated effort: 1-2 days

**Recommended Fix**: Option A - refactor capsule queries to use flattened patterns or separate queries.

---

## Test Infrastructure Issues

### 2. Component Tests - Missing tRPC Mocks

**Severity**: 🟡 **MEDIUM** (Blocks component test suite)

**Issue**: 
- Missing mock functions: `mockGenerateCandidatesUseMutation`, `mockExtractTextUseMutation`
- Tests reference undefined mocks
- tRPC mocking infrastructure incomplete

**Affected Tests**:
- TextInputTab tests (5 failures)
- ConceptsTab tests (multiple failures)
- CapsulesTab tests (multiple failures)
- ConfigTab tests (multiple failures)

**Impact if Unfixed**:
- **Production**: None - these are test-only issues
- **Development**: 
  - Cannot verify component behavior changes
  - Regression testing broken
  - Slows development velocity
  - Risk of introducing bugs

**What's Needed to Fix**:
1. Complete tRPC mock infrastructure in `src/test/utils/mock-trpc-hooks.ts`
2. Add missing mock functions for all mutations/queries
3. Update component tests to use proper mocks
4. Estimated effort: 4-6 hours

---

### 3. ErrorBoundary Test - Node.js Environment Issue

**Severity**: 🟢 **LOW** (Single test, non-critical)

**Issue**: 
```
ReferenceError: setImmediate is not defined
```

**Root Cause**: jsdom test environment doesn't provide `setImmediate` polyfill

**Impact if Unfixed**:
- **Production**: None - ErrorBoundary component works fine
- **Development**: One test fails, but component is functional

**What's Needed to Fix**:
- Add polyfill or use alternative timing function in test
- Estimated effort: 15 minutes

---

### 4. Component Tests - Form Accessibility & Query Issues

**Severity**: 🟡 **MEDIUM** (Test quality issue, may indicate real problems)

**Issues**:
1. Labels not properly associated with form controls
2. Tests querying for elements that don't exist (forms not showing)
3. Loading states not handled in tests

**Affected Components**:
- TextInputTab (label accessibility)
- ConceptsTab (form visibility)
- CapsulesTab (form visibility) 
- ConfigTab (loading states, multiple element matches)

**Impact if Unfixed**:
- **Production**: Potential accessibility issues
- **Development**: Tests may not catch real regressions
- **Accessibility**: Screen reader users may have issues

**What's Needed to Fix**:
1. Fix label associations in components (add `htmlFor` attributes)
2. Update tests to handle loading states properly
3. Fix duplicate text/IDs causing query ambiguity
4. Estimated effort: 3-4 hours

---

## Impact Summary

### If ALL Bugs Remain Unfixed:

#### Production Impact:
- 🔴 **Capsule feature completely broken** - Users cannot use a core feature
- 🟡 **Potential accessibility issues** - Some users may have trouble using forms
- ✅ Other features work (concepts, links, PDF processing)

#### Development Impact:
- 🟡 **41 tests failing** - Cannot verify changes don't break existing functionality
- 🟡 **Slowed development velocity** - Must manually test instead of relying on automated tests
- 🟡 **Higher risk of regressions** - Changes may break existing features without test coverage catching it

#### User Experience Impact:
- 🔴 **Core feature unavailable** - Capsule content management doesn't work
- 🟡 **Accessibility concerns** - Some users may struggle with form interactions

---

## Recommended Fix Priority

### Priority 1 (Fix Immediately):
1. **Capsule Router Prisma Issue** - Blocks core feature
   - Refactor nested includes to flattened queries
   - Test in production-like environment
   - Estimated: 2-4 hours

### Priority 2 (Fix Soon):
2. **Component Test Mocking** - Critical for development workflow
   - Complete tRPC mock infrastructure
   - Estimated: 4-6 hours

3. **Form Accessibility** - User experience and compliance
   - Fix label associations
   - Estimated: 1-2 hours

### Priority 3 (Nice to Have):
4. **ErrorBoundary Test** - Minor issue
   - Add polyfill
   - Estimated: 15 minutes

5. **Test Query Issues** - Improve test reliability
   - Fix loading state handling
   - Fix duplicate queries
   - Estimated: 2-3 hours

---

## Total Estimated Fix Time

- **Critical (Priority 1)**: 2-4 hours
- **Important (Priority 2)**: 5-8 hours  
- **Nice to Have (Priority 3)**: 2-3 hours
- **Total**: 9-15 hours of focused development

---

## Risk Assessment

### High Risk (Unfixed):
- Capsule feature is completely broken in production
- Users cannot manage capsule content
- Core value proposition of application is compromised

### Medium Risk (Unfixed):
- Development velocity slowed
- Higher chance of introducing regressions
- Potential accessibility issues for some users

### Low Risk (Unfixed):
- One test fails but component works
- Test suite reliability concerns but no production impact

