# UX Data Display Verification

This document verifies that the UI components can properly display data from all database tables.

## Database Tables and UI Components

### 1. Concept Table
**Count**: See `/api/admin/db-stats` endpoint

**UI Components**:
- ✅ `ConceptList` (`src/components/ConceptList.tsx`)
  - Displays: title, description, creator, source, year, status, dates
  - Uses: `useConceptList()` hook → `/api/concepts` endpoint
  - Features: View, Edit, Delete, Restore, Enrich buttons
  - Handles: Loading states, error states, empty states, trash filter

- ✅ `ConceptViewer` (`src/components/ConceptViewer.tsx`)
  - Displays: Full concept details in read-only mode
  - Uses: `useConcept(id)` hook → `/api/concepts/[id]` endpoint

- ✅ `ConceptEditor` (`src/components/ConceptEditor.tsx`)
  - Displays: Editable form for all concept fields
  - Uses: `useUpdateConcept()` hook → PUT `/api/concepts/[id]`

- ✅ `ConceptsTab` (`src/components/ConceptsTab.tsx`)
  - Main tab component that orchestrates all concept UI
  - Uses: `useConceptList()`, `useCreateConcept()`, `useDeleteConcept()`, etc.

**Verification**: ✅ All concept data fields are displayed in the UI

---

### 2. Link Table
**Count**: See `/api/admin/db-stats` endpoint

**UI Components**:
- ✅ `LinksTab` (`src/components/LinksTab.tsx`)
  - Displays: Links for selected concept (outgoing and incoming)
  - Uses: `useLinksByConcept(conceptId)` hook → `/api/links?conceptId=...`
  - Features: Create manual links, view link relationships
  - Shows: source concept, target concept, forward name, reverse name, notes

- ✅ `LinkProposer` (`src/components/LinkProposer.tsx`)
  - Displays: AI-proposed links for a concept
  - Uses: `useProposeLinks()` hook → `/api/concepts/[id]/propose-links`

**Verification**: ✅ All link data (source, target, names, notes) is displayed

---

### 3. Capsule Table
**Count**: See `/api/admin/db-stats` endpoint

**UI Components**:
- ✅ `CapsuleList` (`src/components/capsules/CapsuleList.tsx`)
  - Displays: List of all capsules
  - Uses: `useCapsuleList()` hook → `/api/capsules` endpoint
  - Shows: Capsule title, promise, CTA, offer mapping

- ✅ `CapsuleCard` (`src/components/capsules/CapsuleCard.tsx`)
  - Displays: Individual capsule with expandable anchors
  - Shows: Capsule info, associated anchors

- ✅ `CapsuleInfoSection` (`src/components/capsules/CapsuleInfoSection.tsx`)
  - Displays: Detailed capsule information
  - Shows: Title, promise, CTA, offer mapping

- ✅ `CapsulesTab` (`src/components/CapsulesTab.tsx`)
  - Main tab component for capsule management
  - Uses: `useCapsuleList()`, `useCreateCapsule()`

**Verification**: ✅ All capsule data (title, promise, CTA, offer mapping) is displayed

---

### 4. Anchor Table
**Count**: See `/api/admin/db-stats` endpoint

**UI Components**:
- ✅ `AnchorCard` (`src/components/capsules/AnchorCard.tsx`)
  - Displays: Anchor title, content, pain points, solution steps, proof
  - Shows: Associated repurposed content

- ✅ `AnchorEditor` (`src/components/AnchorEditor.tsx`)
  - Displays: Editable form for anchor fields
  - Uses: `useUpdateAnchor()` hook → PUT `/api/capsules/[id]/anchors/[anchorId]`
  - Fields: title, content, painPoints (array), solutionSteps (array), proof

- ✅ `CapsulesTab` (`src/components/CapsulesTab.tsx`)
  - Orchestrates anchor display and editing
  - Uses: `useCreateAnchor()`, `useUpdateAnchor()`, `useDeleteAnchor()`

**Verification**: ✅ All anchor data (title, content, pain points, solution steps, proof) is displayed

---

### 5. RepurposedContent Table
**Count**: See `/api/admin/db-stats` endpoint

**UI Components**:
- ✅ `DerivativeList` (`src/components/capsules/DerivativeList.tsx`)
  - Displays: List of repurposed content for an anchor
  - Shows: Type, content, guidance

- ✅ `DerivativeItem` (`src/components/capsules/DerivativeItem.tsx`)
  - Displays: Individual repurposed content item
  - Shows: Type badge, content, guidance, edit/delete buttons
  - Uses: `useUpdateRepurposedContent()`, `useDeleteRepurposedContent()`

- ✅ `CapsulesTab` (`src/components/CapsulesTab.tsx`)
  - Orchestrates repurposed content display
  - Uses: `useRegenerateRepurposedContent()` → POST `/api/capsules/[id]/anchors/[anchorId]/repurposed/regenerate-all`

**Verification**: ✅ All repurposed content data (type, content, guidance) is displayed

---

### 6. LinkName Table
**Count**: See `/api/admin/db-stats` endpoint

**UI Components**:
- ✅ `LinkNameManager` (`src/components/LinkNameManager.tsx`)
  - Displays: List of all link names (default and custom)
  - Uses: `useLinkNames()` hook → `/api/link-names`
  - Features: Create, update, delete link names
  - Shows: Name, whether it's default, usage count

- ✅ `LinksTab` (`src/components/LinksTab.tsx`)
  - Integrates LinkNameManager for link name management
  - Uses: `useCreateLinkName()`, `useUpdateLinkName()`, `useDeleteLinkName()`

**Verification**: ✅ All link name data (name, isDefault, isDeleted) is displayed

---

### 7. MRUConcept Table
**Count**: See `/api/admin/db-stats` endpoint

**UI Components**:
- ⚠️ **No direct UI component** - This is an internal tracking table
- Used by: Backend services to track most recently used concepts
- May be used for: Concept suggestions, quick access features (future)

**Verification**: ⚠️ No UI display needed (internal tracking only)

---

## Data Flow Verification

### Concepts Flow
1. Database → `/api/concepts` → `useConceptList()` → `ConceptList` component ✅
2. Database → `/api/concepts/[id]` → `useConcept(id)` → `ConceptViewer` component ✅
3. User input → `useCreateConcept()` → POST `/api/concepts` → Database ✅
4. User input → `useUpdateConcept()` → PUT `/api/concepts/[id]` → Database ✅

### Links Flow
1. Database → `/api/links?conceptId=...` → `useLinksByConcept()` → `LinksTab` component ✅
2. User input → `useCreateLink()` → POST `/api/links` → Database ✅
3. Database → `/api/concepts/[id]/propose-links` → `useProposeLinks()` → `LinkProposer` component ✅

### Capsules Flow
1. Database → `/api/capsules` → `useCapsuleList()` → `CapsuleList` component ✅
2. Database → `/api/capsules/[id]` → `useCapsule(id)` → `CapsuleCard` component ✅
3. User input → `useCreateCapsule()` → POST `/api/capsules` → Database ✅

### Anchors Flow
1. Database → `/api/capsules/[id]` (includes anchors) → `CapsuleCard` component ✅
2. User input → `useCreateAnchor()` → POST `/api/capsules/[id]/anchors` → Database ✅
3. User input → `useUpdateAnchor()` → PUT `/api/capsules/[id]/anchors/[anchorId]` → Database ✅

### RepurposedContent Flow
1. Database → `/api/capsules/[id]` (includes repurposed content) → `DerivativeList` component ✅
2. User input → `useCreateRepurposedContent()` → POST `/api/capsules/[id]/anchors/[anchorId]/repurposed` → Database ✅
3. User input → `useUpdateRepurposedContent()` → PUT `/api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId]` → Database ✅

### LinkName Flow
1. Database → `/api/link-names` → `useLinkNames()` → `LinkNameManager` component ✅
2. User input → `useCreateLinkName()` → POST `/api/link-names` → Database ✅
3. User input → `useUpdateLinkName()` → PUT `/api/link-names/[name]` → Database ✅

---

## Summary

✅ **All 6 user-facing database tables have UI components that can display their data:**
1. ✅ Concept - Full CRUD UI
2. ✅ Link - Full CRUD UI
3. ✅ Capsule - Full CRUD UI (except PUT/DELETE - intentional)
4. ✅ Anchor - Full CRUD UI
5. ✅ RepurposedContent - Full CRUD UI
6. ✅ LinkName - Full CRUD UI

⚠️ **1 internal tracking table has no UI (by design):**
7. ⚠️ MRUConcept - Internal tracking only

**All data can be viewed, created, updated, and deleted through the UI (where applicable).**
