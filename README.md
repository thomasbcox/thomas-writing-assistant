# Thomas Writing Assistant

An AI-powered writing assistant that helps create diverse content types while maintaining your authentic voice, values, and perspective across all writing.

## 🎯 Vision

A unified suite of AI writing tools that:
- Maintains **your unique voice** across all content types
- Applies **your core values and beliefs** consistently
- Uses **discourse rules** to ensure balanced, fair communication
- Supports **multiple content types** with specialized workflows
- Provides **transparent, iterative refinement** for important content
- Manages a **Zettelkasten knowledge base** of core concepts
- Generates **capsule content** following Jana Osofsky's high-leverage strategy

## 🚧 Status: In Development

This is an **Electron desktop application** built with React, TypeScript, and Drizzle ORM that provides:
- **Zettelkasten knowledge base** - Extract and link core concepts from your existing writings
- **Capsule content system** - Create evergreen anchor posts and repurpose into multiple formats
- **AI-powered content generation** with style-aware LLM integration
- **Context caching & semantic caching** - Optimized LLM usage with multi-turn conversations and response caching
- **Native desktop experience** - Runs as a standalone application with proper lifecycle management

## 📋 Project Structure

```
thomas-writing-assistant/
├── electron/
│   ├── main.ts                 # Electron main process (database, IPC handlers)
│   ├── preload.ts             # Preload script (exposes IPC API)
│   └── ipc-handlers/          # IPC handler modules
│       ├── concept-handlers.ts
│       ├── link-handlers.ts
│       ├── capsule-handlers.ts
│       ├── config-handlers.ts
│       ├── pdf-handlers.ts
│       └── ai-handlers.ts
├── src/
│   ├── components/             # React components
│   │   ├── ConceptsTab.tsx    # Concept management UI
│   │   ├── LinksTab.tsx       # Link management UI
│   │   ├── CapsulesTab.tsx    # Capsule content UI
│   │   └── ...
│   ├── lib/
│   │   ├── ipc-client.ts      # IPC client (replaces HTTP API)
│   │   └── ...
│   ├── hooks/
│   │   └── useIPC.ts          # IPC React hooks
│   ├── server/
│   │   ├── services/          # Business logic services
│   │   ├── schema.ts          # Drizzle schema definitions
│   │   └── db.ts              # Database utilities (used by main process)
│   └── main.tsx               # React entry point
├── config/                     # Configuration files
│   ├── style_guide.yaml        # Writing voice and preferences
│   ├── credo.yaml              # Core beliefs and values
│   └── constraints.yaml        # Hard rules and boundaries
├── drizzle/                    # Drizzle migrations (generated)
│   └── migrations/             # Database migrations
├── input/
│   └── pdfs/                   # PDF files for processing
├── archive/                    # Archived Python code (legacy)
└── package.json
```

## 🧠 Zettelkasten System

- **Extract core concepts** from PDFs using AI-assisted batch generation
- **Store with Dublin Core metadata** (dc:creator, dc:source, dc:date, dc:description)
- **Create concepts manually** or from PDF processing
- **Concept descriptions** - Short descriptions for each concept, searchable along with titles
- **Bidirectional link names** - Links have forward and reverse names (e.g., "A is parent of B" / "B is child of A")
- **Custom link names** - Create and manage your own relationship types
- **AI-proposed links** between concepts with semantic reasoning
- **Full CRUD operations** for concepts and links (create, edit, delete, restore from trash)
- **Link name management** - Create, rename, replace, and deprecate link names

## 📦 Capsule Content System

Following Jana Osofsky's strategy:
- **4-6 capsules** (12-20 total over time) mapping to main offers
- **Anchor posts** - Evergreen, conversion-ready blog posts
- **Repurposed content** from each anchor:
  - 5-10 short social posts
  - 1 downloadable/lead magnet
  - Email (pain → promise → CTA)
  - Pinterest pins
- **Rotation system** - Resurface and republish systematically

## 🏗️ Tech Stack

- **Electron** - Desktop application framework
- **React** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety across the stack
- **IPC (Inter-Process Communication)** - Direct communication between renderer and main process
- **Drizzle ORM** - Lightweight, TypeScript-first ORM with SQLite
- **Tailwind CSS** - Utility-first styling
- **Jest** - Testing framework
- **SQLite** - Local database (stored in app user data directory)

## 🧪 Testing

- **Test Framework**: Jest with separate environments for Node.js (services) and jsdom (components)
- **Test Strategy**: Test services and IPC handlers directly (no HTTP mocking needed)
- **Component Tests**: Will be updated to test with IPC mocks

## 📝 Features Implemented

1. ✅ Complete Zettelkasten system with concept management
2. ✅ **PDF processing** - Upload and extract text from PDF files
3. ✅ AI-powered concept generation from text and PDFs
4. ✅ Custom link names with full CRUD operations
5. ✅ AI-proposed links between concepts
6. ✅ Concept editing, deletion, and trash/restore system
7. ✅ Modern Electron desktop interface with tab-based UI
8. ✅ Capsule content system (Jana Osofsky strategy)
9. ✅ **Multi-provider LLM support** - OpenAI and Google Gemini
10. ✅ Style-aware LLM integration with configurable providers
11. ✅ **Writing Configuration UI** - Edit style guide, credo, and constraints with immediate reload
12. ✅ Pino error logging with AI-friendly structured format
13. ✅ Data preservation and backup system

## 🔧 Setup

### Prerequisites

- Node.js 18+ and npm
- (Optional) OpenAI API key or Google Gemini API key for LLM features

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   # Generate migrations
   npm run db:generate
   
   # Run migrations
   npm run db:push
   ```

3. **Configure environment variables:**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="file:./dev.db"
   # At least one LLM provider key is required
   OPENAI_API_KEY=your_openai_key_here
   # OR
   GOOGLE_API_KEY=your_gemini_key_here
   NODE_ENV=development
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   This will:
   - Start Vite dev server on port 5173
   - Compile Electron main process
   - Launch Electron window

5. **Build for production:**
   ```bash
   npm run build:all
   npm run package
   ```

### Database Management

- **View database in Drizzle Studio:**
  ```bash
  npm run db:studio
  ```

- **Create a new migration:**
  ```bash
  npm run db:generate
  npm run db:migrate
  ```

## 🧪 Testing

The project uses **Jest** for testing.

- **Run tests:**
  ```bash
  npm test
  ```

- **Run tests in watch mode:**
  ```bash
  npm test -- --watch
  ```

- **Run tests with coverage:**
  ```bash
  npm run test:coverage
  ```

## 📚 Development

### Project Structure

- **`electron/`** - Electron main process and IPC handlers
- **`src/components/`** - React components
- **`src/hooks/useIPC.ts`** - IPC React hooks (replaces tRPC)
- **`src/lib/ipc-client.ts`** - IPC client library
- **`src/server/services/`** - Business logic and service layer
- **`src/server/schema.ts`** - Database schema definition
- **`electron/main.ts`** - Main process (database initialization, IPC handlers)

### Architecture

**Before (Next.js + tRPC):**
```
React Components → tRPC over HTTP → Next.js API Routes → Services → Database
```

**Now (Electron + IPC):**
```
React Components → IPC → Electron Main Process → Services → Database
```

Benefits:
- No HTTP overhead - direct function calls
- Proper app lifecycle - database closes cleanly
- Simpler architecture - fewer layers
- Better file access - native file dialogs
- Easier testing - test handlers directly

### Adding New Features

1. **Database changes:** Update `src/server/schema.ts`, then run `npm run db:generate` and `npm run db:push`
2. **IPC handlers:** Add new handlers in `electron/ipc-handlers/`
3. **UI components:** Add components in `src/components/` using IPC hooks from `src/hooks/useIPC.ts`
4. **Tests:** Add test files in `src/test/` - test services and IPC handlers directly

## 📖 Documentation

- **[Getting Started](./GETTING_STARTED.md)** - Quick start guide
- **[Roadmap](./ROADMAP.md)** - Current status and future plans
- **[Data Preservation](./DATA_PRESERVATION.md)** - Database backup and migration safety
- **[Gemini Integration](./GEMINI_INTEGRATION.md)** - Using Google Gemini as LLM provider
- **[Testing](./TESTING.md)** - Testing documentation and guidelines

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

ISC

---

*This project is in active development.*
