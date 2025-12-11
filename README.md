# Thomas Writing Assistant

**Last Updated**: 2025-12-11

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

This is a **Next.js application** built with the T3 Stack (Next.js, TypeScript, tRPC, Prisma, Tailwind CSS) that provides:
- **Zettelkasten knowledge base** - Extract and link core concepts from your existing writings
- **Capsule content system** - Create evergreen anchor posts and repurpose into multiple formats
- **AI-powered content generation** with style-aware LLM integration

## 📋 Project Structure

```
thomas-writing-assistant/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/trpc/          # tRPC API route handler
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # React components
│   │   ├── ConceptsTab.tsx    # Concept management UI
│   │   ├── LinksTab.tsx       # Link management UI
│   │   ├── CapsulesTab.tsx    # Capsule content UI
│   │   └── ...
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/        # tRPC routers
│   │   │   │   ├── concept.ts  # Concept CRUD operations
│   │   │   │   ├── link.ts     # Link management
│   │   │   │   ├── linkName.ts # Link name management
│   │   │   │   ├── capsule.ts  # Capsule content
│   │   │   │   └── ai.ts       # AI operations
│   │   │   └── trpc.ts         # tRPC setup
│   │   ├── db.ts               # Prisma client with SQLite adapter
│   │   └── services/           # Business logic services
│   ├── lib/                    # Shared utilities
│   └── test/                   # Test files
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── config.ts               # Prisma 7 migration config
│   └── migrations/             # Database migrations
├── config/                     # Configuration files
│   ├── style_guide.yaml        # Writing voice and preferences
│   ├── credo.yaml              # Core beliefs and values
│   └── constraints.yaml        # Hard rules and boundaries
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

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety across the stack
- **tRPC** - End-to-end type-safe APIs
- **Prisma 7** - Modern ORM with SQLite adapter
- **Tailwind CSS** - Utility-first styling
- **Jest** - Testing framework with full Prisma 7 support
- **@testing-library/react** - Component testing utilities
- **@testing-library/user-event** - User interaction simulation
- **SQLite** - Local database (can migrate to Postgres later)

## 🧪 Testing

- **Test Framework**: Jest with separate environments for Node.js (services/routers) and jsdom (components)
- **Current Coverage**: 39.96% statements, 40.65% lines
- **Test Count**: 197 total tests (163 passing, 33 component tests need tRPC provider setup)
- **Test Categories**:
  - ✅ Service layer tests (100% coverage for critical services)
  - ✅ Router/integration tests (comprehensive API testing)
  - ✅ Component unit tests (basic components)
  - ⚠️ Component flow tests (structured, need tRPC provider setup)

**Note**: Component tests for user flows are implemented but require a tRPC React Query provider setup to work properly. The test structure is complete and follows best practices.

## 📝 Features Implemented

1. ✅ Complete Zettelkasten system with concept management
2. ✅ **PDF processing** - Upload and extract text from PDF files
3. ✅ AI-powered concept generation from text and PDFs
4. ✅ Custom link names with full CRUD operations
5. ✅ AI-proposed links between concepts
6. ✅ Concept editing, deletion, and trash/restore system
7. ✅ Modern Next.js web interface with tab-based UI
8. ✅ Comprehensive test suite with Jest (197 tests: 163 passing, 33 component tests need tRPC provider setup)
9. ✅ Capsule content system (Jana Osofsky strategy)
10. ✅ **Multi-provider LLM support** - OpenAI and Google Gemini
11. ✅ Style-aware LLM integration with configurable providers
12. ✅ **Writing Configuration UI** - Edit style guide, credo, and constraints with immediate reload
13. ✅ Prisma 7 with SQLite adapter
14. ✅ Pino error logging with AI-friendly structured format
15. ✅ Data preservation and backup system

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
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
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

5. **Access the application:**
   
   Open [http://localhost:3051](http://localhost:3051) in your browser.
   
   **Note:** The app runs on port 3051 by default. See [SERVER_MANAGEMENT.md](./SERVER_MANAGEMENT.md) for production server setup.

### Database Management

- **View database in Prisma Studio:**
  ```bash
  npm run db:studio
  ```

- **Create a new migration:**
  ```bash
  npm run db:migrate
  ```

- **Regenerate Prisma client after schema changes:**
  ```bash
  npm run db:generate
  ```

## 🧪 Testing

The project uses **Jest** for testing with full Prisma 7 support.

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

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## 📚 Development

### Project Structure

- **`src/app/`** - Next.js App Router pages and API routes
- **`src/components/`** - React components
- **`src/server/api/routers/`** - tRPC routers (API endpoints)
- **`src/server/services/`** - Business logic and service layer
- **`src/server/db.ts`** - Prisma client configuration
- **`prisma/schema.prisma`** - Database schema definition

## 🧪 Testing

The project uses **Jest** for testing with full Prisma 7 support. See [TESTING.md](./TESTING.md) for details.

**Current Coverage:**
- **105 tests** total (all passing)
- **13 test suites** (all passing)
- Routers: 97.1% (excellent coverage)
- Logger: 100% (complete)
- PDF processing: Tested and working

### Adding New Features

1. **Database changes:** Update `prisma/schema.prisma`, then run `npm run db:migrate`
2. **API endpoints:** Add new procedures to routers in `src/server/api/routers/`
3. **UI components:** Add components in `src/components/`
4. **Tests:** Add test files in `src/test/`

## 🔄 Migration from Python

The original Python/Flask implementation has been archived in the `archive/python-app/` directory. The Next.js application provides the same functionality with improved type safety, modern tooling, and better developer experience.

## 📖 Documentation

- **[Getting Started](./GETTING_STARTED.md)** - Quick start guide
- **[Roadmap](./ROADMAP.md)** - Current status and future plans
- **[Data Preservation](./DATA_PRESERVATION.md)** - Database backup and migration safety
- **[Gemini Integration](./GEMINI_INTEGRATION.md)** - Using Google Gemini as LLM provider
- **[Server Management](./SERVER_MANAGEMENT.md)** - PM2 setup and server management
- **[Testing](./TESTING.md)** - Testing documentation and guidelines

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

ISC

---

*This project is in active development.*
