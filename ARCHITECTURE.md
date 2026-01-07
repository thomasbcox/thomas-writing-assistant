# System Architecture

**Last Updated:** January 2, 2025

## Overview

Thomas Writing Assistant is an **Electron desktop application** that provides AI-powered writing assistance with a Zettelkasten knowledge base and capsule content system. The architecture uses **IPC (Inter-Process Communication)** for frontend-backend communication, **Drizzle ORM** for database access, and **SQLite** for local data storage.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Renderer Process                │
│  (React UI - Vite Dev Server or Built Files)                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  React Components                                   │    │
│  │  - ConceptsTab.tsx                                  │    │
│  │  - LinksTab.tsx                                     │    │
│  │  - CapsulesTab.tsx                                  │    │
│  │  - ConfigTab.tsx                                    │    │
│  └──────────────┬─────────────────────────────────────┘    │
│                 │ uses                                      │
│                 ▼                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  IPC Client (src/lib/ipc-client.ts)                │    │
│  │  - Type-safe wrapper around window.electronAPI     │    │
│  │  - Mimics tRPC-like API structure                   │    │
│  └──────────────┬─────────────────────────────────────┘    │
│                 │ calls                                     │
│                 ▼                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Preload Script (electron/preload.ts)              │    │
│  │  - Exposes electronAPI via contextBridge           │    │
│  │  - Bridges renderer ↔ main process                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │ IPC (ipcRenderer.invoke)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                      │
│  (Node.js - electron/main.ts)                                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  IPC Handlers (electron/ipc-handlers/)             │    │
│  │  - concept-handlers.ts                             │    │
│  │  - link-handlers.ts                                │    │
│  │  - capsule-handlers.ts                              │    │
│  │  - config-handlers.ts                              │    │
│  │  - pdf-handlers.ts                                 │    │
│  │  - ai-handlers.ts                                  │    │
│  │  - linkName-handlers.ts                            │    │
│  └──────────────┬─────────────────────────────────────┘    │
│                 │ calls                                     │
│                 ▼                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Service Layer (src/server/services/)              │    │
│  │  - conceptProposer.ts                              │    │
│  │  - linkProposer.ts                                 │    │
│  │  - repurposer.ts                                   │    │
│  │  - anchorExtractor.ts                              │    │
│  │  - blogPostGenerator.ts                            │    │
│  │  - conceptEnricher.ts                              │    │
│  │  - pdfExtractor.ts                                 │    │
│  │  - llm/client.ts (OpenAI, Gemini)                 │    │
│  │  - config.ts (YAML config loader)                  │    │
│  └──────────────┬─────────────────────────────────────┘    │
│                 │ uses                                      │
│                 ▼                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Database Layer (src/server/db.ts)                  │    │
│  │  - Drizzle ORM instance                             │    │
│  │  - SQLite connection (better-sqlite3)               │    │
│  │  - Schema definitions (src/server/schema.ts)         │    │
│  └──────────────┬─────────────────────────────────────┘    │
│                 │                                           │
│                 ▼                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SQLite Database (dev.db / prod.db)                │    │
│  │  - Local file-based storage                         │    │
│  │  - Stored in app directory                          │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend (Renderer Process)
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **IPC Client** - Type-safe wrapper for Electron IPC

### Backend (Main Process)
- **Electron** - Desktop application framework
- **Node.js** - Runtime environment
- **Drizzle ORM** - TypeScript-first ORM
- **better-sqlite3** - SQLite database driver
- **Zod** - Runtime validation
- **Pino** - Structured logging

### External Services
- **OpenAI API** - LLM provider (GPT models)
- **Google Gemini API** - LLM provider (Gemini models)

## Communication Flow

### IPC Communication Pattern

1. **Frontend Request:**
   ```typescript
   // React component
   const result = await ipc.concept.list({ includeTrash: false });
   ```

2. **IPC Client:**
   ```typescript
   // src/lib/ipc-client.ts
   concept: {
     list: (input) => window.electronAPI.concept.list(input)
   }
   ```

3. **Preload Bridge:**
   ```typescript
   // electron/preload.ts
   concept: {
     list: (input) => ipcRenderer.invoke("concept:list", input)
   }
   ```

4. **IPC Handler:**
   ```typescript
   // electron/ipc-handlers/concept-handlers.ts
   ipcMain.handle("concept:list", async (event, input) => {
     // Validate input with Zod
     // Call service layer
     // Return result
   });
   ```

5. **Service Layer:**
   ```typescript
   // src/server/services/conceptProposer.ts
   // Business logic, LLM calls, etc.
   ```

6. **Database:**
   ```typescript
   // src/server/db.ts
   const db = getDb();
   const concepts = await db.select().from(concept);
   ```

## Key Architectural Decisions

### 1. Electron + IPC Instead of Web Framework

**Why:** Desktop application needs native file access, proper lifecycle management, and no HTTP overhead.

**Benefits:**
- Direct function calls (no HTTP serialization)
- Native file dialogs and system integration
- Proper app lifecycle (database closes on quit)
- Simpler architecture (fewer layers)

**Trade-offs:**
- Can't access from browser
- Deployment is different (but appropriate for desktop app)

### 2. Drizzle ORM Instead of Prisma

**Why:** Lighter weight, better TypeScript support, simpler for SQLite.

**Benefits:**
- TypeScript-first design
- Better SQLite support
- Simpler API
- Easier testing (can use in-memory databases)

**Trade-offs:**
- Less mature ecosystem
- Fewer built-in features (migrations, etc.)

### 3. SQLite Instead of PostgreSQL

**Why:** Single-user desktop application doesn't need a server database.

**Benefits:**
- No server setup required
- File-based (easy backups)
- Fast for local use
- Zero configuration

**Trade-offs:**
- No concurrent access (not needed for single user)
- Limited scalability (not needed for desktop app)

### 4. IPC Instead of HTTP/tRPC

**Why:** Electron provides IPC natively, no need for HTTP layer.

**Benefits:**
- No HTTP overhead
- Type-safe with TypeScript
- Direct function calls
- Simpler testing (test handlers directly)

**Trade-offs:**
- Can't use standard HTTP tools (not needed)
- IPC-specific patterns (but well-supported)

## Directory Structure

```
thomas-writing-assistant/
├── electron/                    # Electron main process
│   ├── main.ts                 # Entry point, window management
│   ├── preload.ts              # IPC bridge (contextBridge)
│   ├── db.ts                   # Database initialization
│   └── ipc-handlers/           # IPC handler modules
│       ├── index.ts            # Central registration
│       ├── concept-handlers.ts
│       ├── link-handlers.ts
│       ├── capsule-handlers.ts
│       ├── config-handlers.ts
│       ├── pdf-handlers.ts
│       ├── ai-handlers.ts
│       └── linkName-handlers.ts
├── src/
│   ├── components/             # React components
│   │   ├── ConceptsTab.tsx
│   │   ├── LinksTab.tsx
│   │   ├── CapsulesTab.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── ipc-client.ts      # Type-safe IPC client
│   │   └── ...
│   ├── hooks/
│   │   └── useIPC.ts          # React hooks for IPC
│   ├── server/
│   │   ├── db.ts              # Database connection (Drizzle)
│   │   ├── schema.ts          # Database schema definitions
│   │   └── services/          # Business logic layer
│   │       ├── conceptProposer.ts
│   │       ├── linkProposer.ts
│   │       ├── repurposer.ts
│   │       ├── llm/
│   │       │   ├── client.ts
│   │       │   └── providers/
│   │       └── config.ts
│   └── main.tsx               # React entry point
├── config/                     # YAML configuration files
│   ├── style_guide.yaml
│   ├── credo.yaml
│   └── constraints.yaml
└── drizzle/                    # Database migrations
    └── migrations/
```

## Data Flow Examples

### Example 1: Listing Concepts

```
1. User clicks "Concepts" tab
   ↓
2. ConceptsTab component mounts
   ↓
3. useIPC hook calls: ipc.concept.list({ includeTrash: false })
   ↓
4. IPC client: window.electronAPI.concept.list(...)
   ↓
5. Preload: ipcRenderer.invoke("concept:list", ...)
   ↓
6. Main process: ipcMain.handle("concept:list", ...)
   ↓
7. Handler validates input with Zod
   ↓
8. Handler calls: getDb().select().from(concept)
   ↓
9. Drizzle queries SQLite database
   ↓
10. Results returned through IPC chain
   ↓
11. React component updates with data
```

### Example 2: Generating Concept Candidates

```
1. User pastes text and clicks "Generate Concepts"
   ↓
2. Component calls: ipc.concept.generateCandidates({ text, ... })
   ↓
3. IPC handler receives request
   ↓
4. Handler calls service: generateConceptCandidates(text, ...)
   ↓
5. Service calls: llmClient.completeJSON(prompt)
   ↓
6. LLM client makes API call to OpenAI/Gemini
   ↓
7. Response parsed and validated
   ↓
8. Concept candidates returned to handler
   ↓
9. Handler returns results to renderer
   ↓
10. Component displays candidates for user selection
```

## Service Layer Architecture

The service layer contains business logic and orchestrates external services:

### LLM Services
- **conceptProposer.ts** - Extracts concepts from text using AI
- **linkProposer.ts** - Proposes semantic links between concepts
- **repurposer.ts** - Repurposes anchor content into multiple formats
- **conceptEnricher.ts** - Enriches concept metadata using AI
- **blogPostGenerator.ts** - Generates blog posts from anchors

### Infrastructure Services
- **llm/client.ts** - LLM client abstraction (OpenAI, Gemini)
- **config.ts** - YAML configuration loader
- **pdfExtractor.ts** - PDF text extraction
- **anchorExtractor.ts** - Anchor extraction from PDFs

### Service Layer Pattern

Services are called by IPC handlers and orchestrate:
1. Database queries (via Drizzle)
2. LLM API calls (via LLM client)
3. Configuration loading (via config loader)
4. File system operations

## Database Architecture

### Schema (Drizzle ORM)

- **Concept** - Core knowledge base entries
- **Link** - Relationships between concepts
- **LinkName** - Types of relationships (bidirectional)
- **Capsule** - Content capsules (Jana Osofsky strategy)
- **Anchor** - Evergreen anchor posts
- **RepurposedContent** - Repurposed content from anchors
- **MRUConcept** - Most recently used tracking

### Database Management

- **Migrations:** Drizzle Kit generates migrations
- **Studio:** `npm run db:studio` for visual database browser
- **Backups:** Automated backup system in `scripts/backup-db.sh`
- **Switching:** Runtime database switching via preference file

## Testing Architecture

### Test Strategy

- **Services:** Test directly with in-memory SQLite databases
- **IPC Handlers:** Test handlers with mocked services
- **Components:** Test with IPC mocks (no HTTP mocking needed)
- **Integration:** Test full flows with real database

### Test Utilities

- **In-memory database setup** - `src/test/utils/in-memory-db-setup.ts`
- **IPC test utilities** - `src/test/utils/ipc-test-utils.ts`
- **Test factories** - `src/test/utils/test-factories.ts`
- **Mock dependencies** - `src/test/mocks/`

## Configuration System

### YAML Configuration Files

- **style_guide.yaml** - Writing voice and preferences
- **credo.yaml** - Core beliefs and values
- **constraints.yaml** - Hard rules and boundaries

### Configuration Flow

1. Files stored in `config/` directory
2. Loaded by `ConfigLoader` service (singleton)
3. Used in LLM prompts for style-aware generation
4. Editable via UI with hot reload
5. Validated with YAML parsing

## Error Handling

### Error Flow

1. **Service Layer:** Catches errors, logs with Pino, returns error objects
2. **IPC Handlers:** Validates input with Zod, catches service errors
3. **IPC Client:** Propagates errors to React components
4. **Components:** Display errors via error boundaries and toast notifications

### Logging

- **Pino** - Structured JSON logging
- **Log levels:** error, warn, info, debug
- **AI-friendly format** - Structured for LLM analysis

## Security Considerations

### IPC Security

- **Context Isolation:** Enabled (preload script only)
- **Node Integration:** Disabled in renderer
- **API Exposure:** Only necessary APIs exposed via contextBridge

### Data Security

- **Local Storage:** SQLite database files
- **API Keys:** Stored in environment variables
- **No Network:** Desktop app, no server exposure

## Performance Considerations

### Database

- **SQLite:** Fast for single-user local access
- **Indexes:** Properly indexed for common queries
- **Connection Pooling:** Single connection (SQLite limitation)

### IPC

- **Direct Calls:** No HTTP overhead
- **Serialization:** JSON (native Electron support)
- **Async:** All IPC calls are async/await

### LLM Calls

- **Provider Selection:** User-configurable (OpenAI/Gemini)
- **Model Selection:** User-configurable per provider
- **Caching:** Not implemented (could be added for repeated queries)

## Migration History

### Previous Architecture (Deprecated)

**Before:** Next.js + tRPC + Prisma + PostgreSQL

**Why Changed:**
- Over-engineered for single-user desktop app
- HTTP overhead unnecessary
- Server database unnecessary
- Multiple abstraction layers added complexity

**Migration Completed:**
- ✅ Removed Next.js, tRPC, Prisma, PostgreSQL
- ✅ Implemented Electron + IPC + Drizzle + SQLite
- ✅ Simplified architecture (fewer layers)
- ✅ Better performance (no HTTP overhead)

## Future Considerations

### Potential Enhancements

1. **Offline Support:** Already supported (local SQLite)
2. **Sync:** Could add cloud sync if needed
3. **Multi-window:** Electron supports multiple windows
4. **Plugins:** Could add plugin system for extensibility
5. **LLM Caching:** Cache LLM responses for repeated queries

### Scalability

- **Current:** Single-user desktop application
- **Future:** Could add cloud sync for multi-device use
- **Limitations:** SQLite not suitable for multi-user server

## References

- [README.md](./README.md) - Project overview and setup
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Quick start guide
- [TESTING.md](./TESTING.md) - Testing documentation
- [PRISMA_TO_DRIZZLE_MIGRATION.md](./PRISMA_TO_DRIZZLE_MIGRATION.md) - Migration details

