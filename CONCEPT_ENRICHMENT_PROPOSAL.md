# Concept Enrichment UX Proposal

**Last Updated**: 2025-12-11

## Overview

An integrated AI-powered enrichment workflow that works for:
1. **New concepts** (from candidates in ConceptCandidateList)
2. **Existing concepts** (already saved in the knowledge base)

Both workflows use the same enrichment interface, ensuring consistency and allowing iterative improvement of concepts over time.

---

## Proposed Architecture

### Unified Enrichment Component

A new **`ConceptEnrichmentStudio`** component that handles both flows:

```
/concepts/enrich/new         → New concept from candidate
/concepts/enrich/[conceptId] → Existing concept enrichment
```

### Integration Points

#### 1. **ConceptCandidateList** (New Concepts)
- Current: "Use This" button → Inline form editor
- **Add**: "Enrich with AI" button → Opens `/concepts/enrich/new?candidateData=...`
- Also keep "Use This" for quick manual creation

#### 2. **ConceptEditor** (Existing Concepts)
- Current: Modal with form fields
- **Add**: "Enrich with AI" button in toolbar → Opens `/concepts/enrich/[conceptId]`
- Regular edit still works as before

#### 3. **ConceptList** / **ConceptViewer** (Existing Concepts)
- **Add**: "Enrich" action in concept menu → Opens `/concepts/enrich/[conceptId]`

---

## UX Design: Split-View Enrichment Studio

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Concept Enrichment Studio                          [×]  │
├─────────────────────────────┬───────────────────────────┤
│                             │                           │
│  AI Chat Assistant          │  Live Concept Editor      │
│  (60% width)                │  (40% width)              │
│                             │                           │
│  ┌────────────────────────┐ │  ┌─────────────────────┐ │
│  │ 💬 AI: "I found the    │ │  │ Title:              │ │
│  │    Yerkes-Dodson       │ │  │ [Yerkes-Dodson...]  │ │
│  │    Effect. Should I    │ │  │                     │ │
│  │    fetch author/year?" │ │  │ Description:        │ │
│  └────────────────────────┘ │  │ [Optimal arousal...]│ │
│                             │  │                     │ │
│  ┌────────────────────────┐ │  │ Content:            │ │
│  │ 🤖 Quick Actions:       │ │  │ [Full content...]   │ │
│  │ [Fetch Metadata]        │ │  │                     │ │
│  │ [Expand Definition]     │ │  │ Metadata:           │ │
│  │ [Add Examples]          │ │  │ Creator: [Yerkes]   │ │
│  └────────────────────────┘ │  │ Year: [1908]        │ │
│                             │  │                     │ │
│  ┌────────────────────────┐ │  │ 💡 AI Suggestions:   │ │
│  │ 👤 You: "What's the    │ │  │ • Author field auto │ │
│  │    original paper?"    │ │  │   populated         │ │
│  └────────────────────────┘ │  └─────────────────────┘ │
│                             │                           │
│  ┌────────────────────────┐ │  ┌─────────────────────┐ │
│  │ [Type message...]      │ │  │ [Edit Mode] [Save] │ │
│  │                    [→] │ │  │                     │ │
│  └────────────────────────┘ │  └─────────────────────┘ │
│                             │                           │
└─────────────────────────────┴───────────────────────────┘
```

### Key Features

#### Left Panel: AI Chat Assistant

1. **Conversational Interface**
   - Chat history with user messages and AI responses
   - AI proactively suggests improvements on load
   - Natural language commands: "add examples", "expand definition", "find related concepts"

2. **Quick Action Buttons**
   - Pre-defined actions that appear contextually:
     - "Fetch Metadata" (author, year, source)
     - "Expand Definition"
     - "Add Managerial Examples"
     - "Find Related Concepts"
     - "Improve Clarity"
   - One-click execution

3. **Suggestion Cards**
   - AI presents changes as previewable cards
   - Shows diff: "Change 'Unknown' → 'Yerkes, Robert M. & Dodson, John D. (1908)'"
   - Accept/Reject buttons

4. **Context Awareness**
   - AI knows which field user is editing
   - Provides field-specific suggestions
   - References current concept state

#### Right Panel: Live Concept Editor

1. **Real-time Sync**
   - Auto-updates as AI makes changes
   - Visual indicators show AI-modified fields (subtle badge: "AI-enhanced")
   - User can edit directly; changes sync back to chat context

2. **Standard Form Fields**
   - Title, Description, Content (textarea)
   - Creator, Source, Year
   - Same structure as ConceptEditor for familiarity

3. **AI Suggestion Indicators**
   - Fields with pending AI suggestions show blue highlight
   - Hover shows preview: "AI suggests: [preview]"
   - Click to accept suggestion

4. **Edit Mode Toggle**
   - Switch between "Enrichment Mode" (AI suggestions active) and "Direct Edit Mode" (standard form)
   - Both modes save to same concept

---

## User Flows

### Flow 1: Enriching a New Concept (from Candidate)

1. User views concept candidates in `ConceptCandidateList`
2. Clicks **"Enrich with AI"** on a candidate
3. Opens `/concepts/enrich/new` with candidate data pre-loaded
4. AI immediately analyzes and suggests:
   - "I found 'Yerkes-Dodson Effect'. Should I fetch the original research metadata?"
5. User clicks "Yes" or types "fetch metadata"
6. AI populates Creator, Year, Source fields
7. User can:
   - Chat: "Can you expand the managerial application section?"
   - Use quick actions: Click "Add Examples"
   - Edit directly in right panel
8. Click **"Save as Concept"** → Creates concept and closes enrichment studio
9. Returns to candidate list with success message

### Flow 2: Enriching an Existing Concept

1. User views concept in `ConceptList` or `ConceptViewer`
2. Clicks **"Enrich"** action (or "Enrich with AI" in ConceptEditor)
3. Opens `/concepts/enrich/[conceptId]` with current concept data
4. AI analyzes current state:
   - "I notice the creator field is empty. Should I fetch it?"
   - "The definition could be expanded with more detail. Want me to improve it?"
5. User iteratively improves:
   - Chat back and forth
   - Accept/reject suggestions
   - Make direct edits
6. Changes auto-save periodically (or manual "Save Changes" button)
7. User can close and return; changes are saved
8. Concept remains editable via normal ConceptEditor

### Flow 3: Iterative Refinement Over Time

1. User creates concept (via enrichment or manually)
2. Later, returns to concept
3. Clicks "Enrich" again
4. AI can:
   - Review what's changed since last enrichment
   - Suggest improvements based on new context
   - Fetch updated information
5. User refines further
6. Concept continuously improves through conversation

---

## Technical Implementation

### New Components

```
src/components/enrichment/
├── ConceptEnrichmentStudio.tsx    # Main container (split view)
├── EnrichmentChatPanel.tsx        # Left panel (chat interface)
├── EnrichmentEditorPanel.tsx      # Right panel (live editor)
├── AISuggestionCard.tsx           # Individual suggestion cards
├── QuickActionButton.tsx          # Pre-defined action buttons
└── EnrichmentToolbar.tsx          # Top toolbar with mode toggle
```

### New API Routes

```
src/server/api/routers/
└── enrichment.ts
    ├── analyzeConcept             # AI analyzes concept and suggests improvements
    ├── enrichMetadata             # Fetch author/year/source from Wikipedia/DB
    ├── expandDefinition           # AI expands definition
    ├── addExamples                # AI adds examples
    ├── chat                       # General conversational enrichment
    └── applySuggestion            # Apply a specific AI suggestion
```

### Route Structure

```typescript
// app/concepts/enrich/[conceptId]/page.tsx
// app/concepts/enrich/new/page.tsx

// Both use same ConceptEnrichmentStudio component
// Props: conceptId (existing) or candidateData (new)
```

---

## Integration with Existing Components

### ConceptCandidateList.tsx

```tsx
// Add new button next to "Use This"
<button
  onClick={() => {
    const params = new URLSearchParams({
      title: candidate.title,
      definition: candidate.coreDefinition,
      application: candidate.managerialApplication,
      content: candidate.content,
    });
    window.open(`/concepts/enrich/new?${params.toString()}`, '_blank');
  }}
  className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
>
  ✨ Enrich with AI
</button>
```

### ConceptEditor.tsx

```tsx
// Add button in toolbar
<div className="flex gap-2 justify-between items-center mb-4">
  <h2 className="text-2xl font-semibold">Edit Concept</h2>
  <button
    onClick={() => {
      window.open(`/concepts/enrich/${conceptId}`, '_blank');
    }}
    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
  >
    ✨ Enrich with AI
  </button>
</div>
```

### ConceptList.tsx / ConceptActions.tsx

```tsx
// Add to action menu
<button
  onClick={() => {
    window.open(`/concepts/enrich/${concept.id}`, '_blank');
  }}
  className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50"
>
  ✨ Enrich
</button>
```

---

## State Management

### Enrichment State

```typescript
interface EnrichmentState {
  // Concept data (can be from candidate or existing concept)
  conceptId: string | null; // null for new concepts
  candidateData?: ConceptCandidate; // only for new concepts
  
  // Form data (synced between chat and editor)
  formData: ConceptFormData;
  
  // Chat state
  messages: Array<ChatMessage>;
  isAIThinking: boolean;
  
  // Suggestions
  pendingSuggestions: Array<AISuggestion>;
  appliedSuggestions: Array<string>; // IDs of applied suggestions
  
  // Sync state
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
}
```

### Auto-save Strategy

- **New concepts**: Manual save only ("Save as Concept" button)
- **Existing concepts**: 
  - Auto-save every 30 seconds if changes detected
  - Manual "Save Changes" button
  - Warn before closing if unsaved changes

---

## AI Service Integration

### Enrichment Service

```typescript
// src/server/services/conceptEnricher.ts

export async function enrichConceptMetadata(
  title: string,
  llmClient: LLMClient,
  configLoader: ConfigLoader
): Promise<{
  creator?: string;
  year?: string;
  source?: string;
  sourceUrl?: string;
}> {
  // 1. Use LLM to identify concept name variants
  // 2. Search Wikipedia or academic databases
  // 3. Extract metadata (author, year, source)
  // 4. Return structured data
}

export async function expandDefinition(
  currentDefinition: string,
  llmClient: LLMClient,
  configLoader: ConfigLoader
): Promise<string> {
  // Use LLM to expand definition while maintaining style
}

export async function chatEnrichConcept(
  message: string,
  conceptState: ConceptFormData,
  chatHistory: Array<ChatMessage>,
  llmClient: LLMClient,
  configLoader: ConfigLoader
): Promise<{
  response: string;
  suggestions?: Array<AISuggestion>;
  actions?: Array<QuickAction>;
}> {
  // Conversational enrichment with context awareness
}
```

---

## Benefits of This Approach

1. **Unified Experience**: Same enrichment workflow for new and existing concepts
2. **Iterative Improvement**: Concepts can be enriched multiple times over their lifetime
3. **Flexibility**: Chat OR direct edit, user chooses the mode
4. **Non-Destructive**: Enrichment is additive; user always in control
5. **Familiar Pattern**: Split-view chat is a known pattern (GitHub Copilot, ChatGPT Code Interpreter)
6. **Extensible**: Easy to add new enrichment capabilities over time

---

## Next Steps

1. Create `ConceptEnrichmentStudio` component structure
2. Implement chat interface with tRPC endpoints
3. Build live-sync editor panel
4. Integrate Wikipedia/search APIs for metadata fetching
5. Add "Enrich" buttons to existing components
6. Test both new and existing concept flows
7. Add auto-save functionality for existing concepts

