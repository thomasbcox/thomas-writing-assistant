# Component Testing Strategy for Critical User Flows

## Overview

Component tests should focus on **user workflows** rather than implementation details. This document outlines what's needed to test critical user flows in the application.

## Critical User Flows to Test

### 1. **Capsule Content Workflow** (Highest Priority)
**Component**: `CapsulesTab.tsx`

**User Flow**: Create capsule → Upload PDF → Generate anchor → View derivatives → Edit/Delete

**What to Test:**

#### Flow 1: Create New Capsule
```
1. User clicks "Create New Capsule"
2. Fills in title, promise, CTA
3. Submits form
4. Capsule appears in list
5. Success toast appears
```

**Test Cases:**
- ✅ Form renders with all fields
- ✅ Form validation (required fields)
- ✅ Submit creates capsule via API
- ✅ Success toast appears
- ✅ Capsule list refreshes
- ✅ Form resets after success
- ❌ Error handling (API failure)
- ❌ Loading state during submission

#### Flow 2: Upload PDF and Create Anchor
```
1. User selects "Create new capsule" or "Use existing capsule"
2. Uploads PDF file
3. System processes PDF
4. Anchor is created with metadata
5. Derivatives are generated (if auto-repurpose enabled)
6. Success message shows anchor and derivative count
```

**Test Cases:**
- ✅ File input accepts PDF files
- ✅ Radio button toggles between "existing" and "new" capsule
- ✅ New capsule form appears when "Create new" selected
- ✅ PDF upload triggers API call
- ✅ Loading state during processing
- ✅ Success message displays anchor title and derivative count
- ✅ Error handling for invalid PDF
- ✅ Error handling for API failures
- ✅ Form resets after success

#### Flow 3: View and Manage Derivatives
```
1. User expands capsule card
2. Clicks "View Derivatives" on anchor
3. Derivatives list appears
4. User can edit individual derivative
5. User can delete derivative
6. User can regenerate all derivatives
```

**Test Cases:**
- ✅ Capsule card expands/collapses
- ✅ "View Derivatives" button shows derivative list
- ✅ Derivatives display with correct types (social_post, email, etc.)
- ✅ Edit button opens inline editor
- ✅ Save updates derivative via API
- ✅ Delete button shows confirmation dialog
- ✅ Delete removes derivative
- ✅ "Regenerate Derivatives" shows confirmation
- ✅ Regenerate replaces all derivatives
- ✅ Success/error toasts appear

#### Flow 4: Edit and Delete Anchor
```
1. User clicks "Edit" on anchor
2. AnchorEditor modal opens
3. User modifies fields
4. Saves changes
5. Anchor updates in list
```

**Test Cases:**
- ✅ Edit button opens AnchorEditor
- ✅ Form pre-populates with anchor data
- ✅ Save updates anchor via API
- ✅ Changes reflect in capsule list
- ✅ Delete button shows confirmation
- ✅ Delete removes anchor and derivatives
- ✅ Error handling for API failures

### 2. **Concept Management Workflow** (High Priority)
**Component**: `ConceptsTab.tsx`

**User Flow**: Create concept → Search → Edit → Delete → Restore from trash

**What to Test:**

#### Flow 1: Create Concept
```
1. User clicks "Create New Concept"
2. Fills in form (title, description, content, metadata)
3. Submits
4. Concept appears in list
```

**Test Cases:**
- ✅ Create form renders
- ✅ Form validation
- ✅ Submit creates concept
- ✅ Concept appears in list
- ✅ Success toast
- ✅ Form closes after success

#### Flow 2: Search and Filter
```
1. User types in search box
2. Results filter in real-time
3. User toggles "Show Trash"
4. Trash items appear
```

**Test Cases:**
- ✅ Search input filters concepts
- ✅ Search is debounced (if implemented)
- ✅ "Show Trash" toggle works
- ✅ Trash items display correctly
- ✅ Empty state when no results

#### Flow 3: Edit Concept
```
1. User clicks "Edit" on concept
2. ConceptEditor opens
3. User modifies fields
4. Saves changes
5. Concept updates in list
```

**Test Cases:**
- ✅ Edit button opens editor
- ✅ Form pre-populates
- ✅ Save updates concept
- ✅ Changes reflect in list
- ✅ Cancel closes editor

#### Flow 4: Delete and Restore
```
1. User clicks "Delete"
2. Confirmation dialog appears
3. User confirms
4. Concept moves to trash
5. User can restore from trash
```

**Test Cases:**
- ✅ Delete shows confirmation
- ✅ Confirm deletes concept
- ✅ Concept moves to trash
- ✅ Restore button appears in trash view
- ✅ Restore brings concept back
- ✅ Purge trash removes permanently

### 3. **Text Input and Concept Generation** (Medium Priority)
**Component**: `TextInputTab.tsx`

**User Flow**: Paste text → Generate concepts → Review candidates → Save selected

**What to Test:**

#### Flow 1: Generate Concepts from Text
```
1. User pastes text or uploads PDF
2. Clicks "Generate Concepts"
3. Loading indicator appears
4. Concept candidates appear
5. User selects concepts to save
6. Concepts are created
```

**Test Cases:**
- ✅ Text input accepts text
- ✅ PDF upload works
- ✅ Generate button triggers API
- ✅ Loading state during generation
- ✅ Candidates list appears
- ✅ Selection checkboxes work
- ✅ Save creates selected concepts
- ✅ Error handling for API failures

### 4. **Configuration Management** (Medium Priority)
**Component**: `ConfigTab.tsx`

**User Flow**: Select section → Edit YAML → Save → Config reloads

**What to Test:**

#### Flow 1: Edit Style Guide
```
1. User clicks "Style Guide" tab
2. YAML content loads
3. User edits content
4. Clicks "Save & Reload"
5. Success toast appears
6. Changes are immediately available
```

**Test Cases:**
- ✅ Tab switching works
- ✅ YAML content loads
- ✅ Textarea is editable
- ✅ Save validates YAML
- ✅ Invalid YAML shows error
- ✅ Valid YAML saves and reloads
- ✅ Success toast appears
- ✅ Error handling for API failures

## Testing Approach

### 1. **Mock tRPC Hooks**

Since components use tRPC hooks, we need to mock them:

```typescript
// Example: Mock tRPC for CapsulesTab
jest.mock("~/lib/trpc/react", () => ({
  api: {
    capsule: {
      list: {
        useQuery: jest.fn(() => ({
          data: mockCapsules,
          isLoading: false,
          refetch: jest.fn(),
        })),
      },
      create: {
        useMutation: jest.fn(() => ({
          mutate: jest.fn(),
          isPending: false,
        })),
      },
      // ... more mocks
    },
  },
}));
```

### 2. **Test User Interactions**

Use React Testing Library's user-event:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("user can create a capsule", async () => {
  const user = userEvent.setup();
  render(<CapsulesTab />);
  
  // Click create button
  await user.click(screen.getByText("Create New Capsule"));
  
  // Fill form
  await user.type(screen.getByLabelText("Title"), "Test Capsule");
  await user.type(screen.getByLabelText("Promise"), "Test Promise");
  
  // Submit
  await user.click(screen.getByText("Create Capsule"));
  
  // Verify API was called
  expect(mockCreateMutation.mutate).toHaveBeenCalledWith({
    title: "Test Capsule",
    promise: "Test Promise",
    // ...
  });
});
```

### 3. **Test Loading States**

```typescript
test("shows loading state during PDF upload", async () => {
  const { rerender } = render(<CapsulesTab />);
  
  // Initially not loading
  expect(screen.queryByText("Processing...")).not.toBeInTheDocument();
  
  // Simulate loading state
  mockCreateAnchorFromPDFMutation.isPending = true;
  rerender(<CapsulesTab />);
  
  // Loading indicator appears
  expect(screen.getByText("Processing...")).toBeInTheDocument();
});
```

### 4. **Test Error Handling**

```typescript
test("shows error toast on API failure", async () => {
  const user = userEvent.setup();
  mockCreateMutation.mutate.mockRejectedValue(new Error("API Error"));
  
  render(<CapsulesTab />);
  await user.click(screen.getByText("Create New Capsule"));
  await user.type(screen.getByLabelText("Title"), "Test");
  await user.click(screen.getByText("Create Capsule"));
  
  // Error toast appears
  expect(screen.getByText(/Failed to create/i)).toBeInTheDocument();
});
```

### 5. **Test Confirmation Dialogs**

```typescript
test("shows confirmation before deleting anchor", async () => {
  const user = userEvent.setup();
  render(<CapsulesTab />);
  
  // Expand capsule
  await user.click(screen.getByText("Test Capsule"));
  
  // Click delete
  await user.click(screen.getByLabelText("Delete anchor"));
  
  // Confirmation dialog appears
  expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
  
  // Confirm deletion
  await user.click(screen.getByText("Confirm"));
  
  // API called
  expect(mockDeleteMutation.mutate).toHaveBeenCalled();
});
```

## Test Structure

### Example Test File Structure

```typescript
// src/test/components/CapsulesTab.test.tsx
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CapsulesTab } from "~/components/CapsulesTab";

// Mock tRPC
jest.mock("~/lib/trpc/react", () => ({
  api: {
    capsule: {
      list: {
        useQuery: jest.fn(),
      },
      create: {
        useMutation: jest.fn(),
      },
      // ... more mocks
    },
  },
}));

describe("CapsulesTab - User Flows", () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe("Create Capsule Flow", () => {
    it("allows user to create a new capsule", async () => {
      // Test implementation
    });
    
    it("shows validation errors for empty fields", async () => {
      // Test implementation
    });
    
    it("displays success toast after creation", async () => {
      // Test implementation
    });
  });

  describe("PDF Upload Flow", () => {
    it("allows user to upload PDF and create anchor", async () => {
      // Test implementation
    });
    
    it("shows loading state during processing", async () => {
      // Test implementation
    });
    
    it("displays error for invalid PDF", async () => {
      // Test implementation
    });
  });

  // ... more flow groups
});
```

## What NOT to Test

### ❌ Don't Test Implementation Details
- Internal state management
- Component structure/HTML
- CSS classes
- Internal function calls

### ❌ Don't Test Third-Party Libraries
- tRPC internals
- React internals
- UI library internals

### ✅ DO Test User-Facing Behavior
- What user sees
- What user can do
- User interactions
- User feedback (toasts, errors)

## Priority Order

### Phase 1: Critical Flows (Start Here)
1. **Capsule PDF Upload** - Core feature, complex workflow
2. **Concept Creation** - Core feature, frequently used
3. **Anchor/Derivative Management** - Core feature, complex interactions

### Phase 2: Important Flows
4. **Concept Search/Filter** - Frequently used
5. **Configuration Editing** - New feature, needs validation
6. **Delete/Restore** - Important for data safety

### Phase 3: Nice to Have
7. **Link Management** - Less frequently used
8. **Settings** - Simple, low risk

## Expected Coverage Gains

**Current Component Coverage**: ~2%
**Target Component Coverage**: 60-70%

**Breakdown:**
- CapsulesTab: 0% → 70% (complex, high value)
- ConceptsTab: 0% → 65% (frequently used)
- ConfigTab: 0% → 60% (new feature)
- TextInputTab: 0% → 50% (moderate complexity)
- Other components: 0% → 30% (lower priority)

**Overall Project Coverage Impact:**
- Current: 37.81%
- After Phase 1: ~50%
- After Phase 2: ~60%
- After Phase 3: ~65-70%

## Tools Needed

### Required Dependencies
```json
{
  "@testing-library/react": "^16.3.0",
  "@testing-library/user-event": "^14.5.0",
  "@testing-library/jest-dom": "^6.9.1"
}
```

### Test Utilities to Create

1. **Mock tRPC Helper**
```typescript
// src/test/utils/mock-trpc.ts
export function createMockTRPC() {
  return {
    capsule: {
      list: { useQuery: jest.fn() },
      create: { useMutation: jest.fn() },
      // ...
    },
  };
}
```

2. **Render Helper with Providers**
```typescript
// src/test/utils/render-with-providers.tsx
export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TRPCProvider>{children}</TRPCProvider>
    ),
  });
}
```

3. **Mock Data Factories**
```typescript
// src/test/utils/factories.ts
export function createMockCapsule(overrides = {}) {
  return {
    id: "capsule-1",
    title: "Test Capsule",
    // ... defaults
    ...overrides,
  };
}
```

## Example: Complete Test for Capsule Creation

```typescript
describe("CapsulesTab - Create Capsule Flow", () => {
  it("allows user to create a new capsule successfully", async () => {
    const user = userEvent.setup();
    const mockRefetch = jest.fn();
    const mockMutate = jest.fn();
    
    // Setup mocks
    mockCapsuleList.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });
    
    mockCapsuleCreate.useMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    
    render(<CapsulesTab />);
    
    // 1. Click create button
    await user.click(screen.getByText("Create New Capsule"));
    
    // 2. Verify form appears
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/promise/i)).toBeInTheDocument();
    
    // 3. Fill form
    await user.type(screen.getByLabelText(/title/i), "My Test Capsule");
    await user.type(screen.getByLabelText(/promise/i), "This will help you");
    await user.type(screen.getByLabelText(/cta/i), "Get started now");
    
    // 4. Submit
    await user.click(screen.getByRole("button", { name: /create capsule/i }));
    
    // 5. Verify API called
    expect(mockMutate).toHaveBeenCalledWith({
      title: "My Test Capsule",
      promise: "This will help you",
      cta: "Get started now",
    });
    
    // 6. Verify refetch called on success
    mockMutate.mock.calls[0][1]?.onSuccess?.();
    expect(mockRefetch).toHaveBeenCalled();
  });
});
```

## Summary

**What's Needed:**

1. **Mock tRPC hooks** - All API calls need to be mocked
2. **Test user interactions** - Click, type, submit
3. **Test loading states** - Show/hide loading indicators
4. **Test error handling** - Error toasts and messages
5. **Test confirmation dialogs** - Delete confirmations
6. **Test success flows** - Complete user workflows end-to-end

**Focus Areas:**
- User-visible behavior, not implementation
- Critical workflows (capsule, concept management)
- Error states and edge cases
- User feedback (toasts, confirmations)

## Current Status

**✅ Completed:**
- Test infrastructure (mock utilities, test factories)
- 28 component test files created covering all critical flows
- Test structure follows best practices
- Tests focus on user-visible behavior

**⚠️ In Progress:**
- Component tests need tRPC React Query provider setup
- tRPC hooks require React context which needs proper mocking
- Tests are structured correctly but need provider wrapper

**Next Steps:**
1. Create a tRPC test provider that wraps components with QueryClientProvider and tRPC Provider
2. Update component tests to use the provider wrapper
3. Verify all 28 component tests pass
4. Expected coverage improvement: 2% → 60-70% component coverage

**Expected Effort:**
- Phase 1 (Critical): 2-3 days (structure complete, needs provider setup)
- Phase 2 (Important): 1-2 days
- Phase 3 (Nice to have): 1 day

**Expected Result:**
- Component coverage: 2% → 60-70%
- Overall coverage: 40% → 50-55%

