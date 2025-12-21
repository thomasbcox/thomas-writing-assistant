# Project History

**Purpose**: This document maintains a high-level narrative of the project's evolution, including major decisions, errors, scope changes, and patterns adopted. The README and requirements documents reflect the current state; this document tells the story of how we got here.

---

## Project Genesis (December 2024)

### Initial Vision
The project began as a migration from a Python/Flask application to a modern Next.js-based writing assistant. The core vision was to create an AI-powered writing tool that:
- Maintains the user's unique voice across all content types
- Applies core values and beliefs consistently
- Manages a Zettelkasten knowledge base
- Generates capsule content following Jana Osofsky's strategy

### Initial Tech Stack Decision
**Decision**: Adopt the T3 Stack (Next.js, TypeScript, tRPC, Prisma, Tailwind CSS)

**Rationale**: 
- Type safety across the entire stack (TypeScript + tRPC)
- Modern React patterns with Next.js App Router
- Prisma for type-safe database access
- Single codebase for full-stack development

**Database Choice**: SQLite initially, with option to migrate to PostgreSQL later

**Testing Framework**: Jest (chosen for Prisma 7 compatibility)

---

## Early Development Phase

### Architecture Decisions

#### Service Layer Pattern
**Decision**: Implement a clear service layer separating business logic from API routes

**Pattern**: 
- `src/server/services/` - Pure business logic functions
- `src/server/api/routers/` - tRPC routers that call services
- Services are testable in isolation without HTTP concerns

**Why**: Enables comprehensive testing, clear separation of concerns, and easier maintenance

#### Configuration System
**Decision**: YAML-based configuration files for writing style, credo, and constraints

**Implementation**:
- `config/style_guide.yaml` - Writing voice and tone
- `config/config.yaml` - Core beliefs and values  
- `config/constraints.yaml` - Hard rules and boundaries

**Why**: Human-readable, version-controllable, easy to edit

---

## Major Feature Implementations

### Zettelkasten System
**Timeline**: Core implementation in early development

**Features**:
- Concept extraction from PDFs and text
- Dublin Core metadata support
- Bidirectional link names
- Custom relationship types
- AI-proposed links between concepts
- Trash/restore system

### Capsule Content System
**Timeline**: Implemented following initial Zettelkasten work

**Strategy**: Jana Osofsky's high-leverage content approach
- Anchor posts (evergreen blog posts)
- Repurposed content (social posts, emails, lead magnets)
- Rotation system for resurfacing content

### PDF Processing
**Timeline**: Added to enable concept extraction from existing documents

**Implementation**: `pdf-parse` library for text extraction
- Upload PDFs through UI
- Extract text automatically
- Generate concept candidates from extracted text

### Multi-Provider LLM Support
**Timeline**: Added after initial OpenAI-only implementation

**Decision**: Support multiple LLM providers (OpenAI, Google Gemini)

**Architecture**: Provider-agnostic LLM client
- Runtime provider switching
- Settings UI for provider/model selection
- Automatic provider selection based on available API keys

**Why**: Flexibility, cost optimization, provider redundancy

---

## Critical Incidents & Lessons Learned

### Incident 1: API Key Exposure (December 2024)
**What Happened**: Google Gemini API key was hardcoded in `GEMINI_INTEGRATION.md` and committed to git history

**Impact**: 
- Key exposed in repository
- Required immediate revocation and rotation
- Potential security risk if repository was public

**Response**:
1. Immediate key revocation in Google Cloud Console
2. Key removed from current file
3. Attempted git history cleanup (challenging with `git filter-branch`)
4. Implemented comprehensive prevention measures

**Prevention Measures Adopted**:
- Pre-commit hook for secret detection
- Updated `.gitignore` with secret patterns
- Security documentation (`PREVENT_SECRET_EXPOSURE.md`)
- Contributing guidelines emphasizing security

**Pattern Established**: Never commit secrets, even in documentation. Always use placeholders.

### Incident 2: Configuration File Overwriting (December 2024)
**What Happened**: Configuration files (`style_guide.yaml`, `credo.yaml`, `constraints.yaml`) were accidentally overwritten with minimal placeholder content ("tone: updated", "Updated constraint")

**Impact**: 
- All writing configuration data lost
- Required restoration from git history
- User had to manually restore content

**Response**:
1. Restored files from git history
2. Implemented validation and backup system
3. Added pre-commit hook protection

**Prevention Measures Adopted**:
- **API-level validation**: Minimum length checks (200 chars), placeholder pattern detection
- **Automatic backups**: Timestamped backups before overwriting (keeps last 10)
- **Pre-commit hook**: Blocks commits with minimal/placeholder config files
- **Error messages**: Clear feedback when validation fails

**Pattern Established**: Critical user data (config files) must be protected with validation, backups, and git hooks.

---

## Infrastructure Evolution

### Server Management Requirements
**Timeline**: December 2024

**Requirement Established**: Server must always be running
- Auto-start on system boot
- Auto-restart on code changes
- Auto-restart on crashes
- Persistent across terminal sessions

**Implementation**:
- PM2 process manager
- `ecosystem.config.cjs` configuration
- File watching enabled (`watch: true`)
- macOS LaunchAgent for auto-start on boot

**Pattern Established**: Production-like server management even in development for reliability.

### Database Evolution
**Initial**: SQLite (single file, easy setup)

**Consideration**: PostgreSQL migration for production readiness

**Decision**: Keep SQLite for now, designed schema to be migration-ready

**Why**: 
- Simpler local development
- No external dependencies
- Can migrate later if needed
- Prisma abstracts database differences

### Testing Infrastructure
**Initial**: Jest with basic setup

**Evolution**:
- Separate test environments (Node.js for services/routers, jsdom for components)
- Comprehensive mocking utilities
- Test coverage tracking
- Service layer tests with mocked LLM clients

**Current State**: 105 tests passing across 13 test suites

---

## Patterns & Practices Established

### Pre-Commit Hooks
**When**: December 2024 (after security and config incidents)

**Checks Implemented**:
1. **Secret Detection**: Blocks API keys, tokens (AIzaSy..., sk-...)
2. **Config File Validation**: Blocks minimal/placeholder config files
3. **TypeScript Type Checking**: Blocks commits with type errors

**Why**: 
- Prevents security issues before they reach git
- Prevents data loss (config overwrites)
- Prevents build failures (type errors)
- Catches issues locally before CI/CD

**Pattern**: Automated quality gates at commit time for critical issues.

### Configuration Protection
**When**: December 2024 (after config overwrite incident)

**Mechanisms**:
- API-level validation (minimum length, placeholder detection)
- Automatic backups before overwriting
- Pre-commit hook validation
- Clear error messages

**Pattern**: Defense in depth for critical user data.

### Error Logging
**Implementation**: Pino logger with structured JSON format

**Features**:
- AI-friendly structured format
- Full context (stack traces, input, path, request IDs)
- tRPC error handler integration
- Service error logging

**Pattern**: Structured logging for better debugging and AI-assisted analysis.

### Health Monitoring
**When**: December 2024

**Implementation**: `/api/health` endpoint with system status

**Checks**:
- Server responsiveness
- Database connectivity
- Configuration file status
- API responsiveness

**Pattern**: Proactive monitoring for system health visibility.

---

## Scope Changes & Pivots

### Migration from Python
**Original**: Python/Flask application (archived in `archive/python-app/`)

**Decision**: Complete rewrite in Next.js/TypeScript

**Why**: 
- Better type safety
- Modern tooling
- Single codebase
- Better developer experience

**Status**: Python code archived, all functionality migrated

### API Architecture: tRPC vs REST
**Initial**: tRPC (T3 Stack standard)

**Current**: tRPC maintained

**Consideration**: Some discussion of REST migration, but tRPC maintained for type safety

**Why**: End-to-end type safety is valuable, tRPC fits the stack well

### Testing Framework: Jest vs Vitest
**Initial**: Jest

**Consideration**: Vitest migration considered for faster tests

**Decision**: Stayed with Jest

**Why**: 
- Better Prisma 7 compatibility
- Established patterns
- Sufficient performance
- Team familiarity

---

## Technical Challenges & Solutions

### Prisma Nested Include Issues
**Problem**: Prisma 7 with SQLite adapter had issues with deeply nested `include` queries in capsule operations

**Impact**: Capsule feature partially broken (list/getById worked, repurposed content operations failed)

**Solution**: Flattened queries where possible, used separate queries and manual combination

**Status**: Resolved through query refactoring

**Pattern**: When ORM limitations hit, refactor queries rather than waiting for fixes.

### Database Connectivity Issues
**Problem**: PostgreSQL connection issues during development

**Challenges**:
- Role creation
- Database creation
- Permission issues
- Migration compatibility

**Solution**: Systematic debugging, proper role setup, `prisma db push` for schema sync

**Pattern**: Database setup requires careful attention to roles, permissions, and connection strings.

---

## Documentation Philosophy

### Living Documentation
**Approach**: Documentation reflects current reality, not aspirational state

**Files**:
- `README.md` - Current state, how to use
- `ROADMAP.md` - Current status and future plans
- `PROJECT_HISTORY.md` (this file) - Narrative of changes

**Pattern**: README = "what is", HISTORY = "how we got here"

### Documentation Categories
1. **User Guides**: `GETTING_STARTED.md`, `CONFIG_MANAGEMENT.md`
2. **Technical Docs**: `TESTING.md`, `SERVER_MANAGEMENT.md`
3. **Architecture**: `SERVICE_LAYER_ARCHITECTURE.md`, `ARCHITECTURE_REVIEW.md`
4. **Incident Reports**: `SECURITY_INCIDENT_API_KEY.md`, `EXPOSED_KEYS_REPORT.md`
5. **Decision Records**: This file, `REQUIREMENTS_VS_IMPLEMENTATION.md`

**Pattern**: Categorize documentation by purpose and audience.

---

## Current State (December 2024)

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **API**: tRPC
- **Database**: SQLite (Prisma 7)
- **Styling**: Tailwind CSS
- **Testing**: Jest
- **Process Management**: PM2
- **Logging**: Pino

### Core Features
- ✅ Zettelkasten knowledge base
- ✅ Capsule content system
- ✅ PDF processing
- ✅ Multi-provider LLM support
- ✅ Writing configuration system
- ✅ Health monitoring

### Quality Measures
- ✅ Pre-commit hooks (secrets, config, types)
- ✅ Configuration protection (validation, backups)
- ✅ Comprehensive test suite (105 tests)
- ✅ Structured error logging
- ✅ Health status monitoring

### Patterns in Use
- Service layer architecture
- Provider-agnostic LLM client
- Configuration file protection
- Pre-commit quality gates
- Structured logging
- Health monitoring

---

## Lessons Learned

### Security
1. **Never commit secrets** - Even in documentation, even temporarily
2. **Automate prevention** - Pre-commit hooks catch issues before they're committed
3. **Document incidents** - Learn from mistakes, prevent recurrence

### Data Protection
1. **Validate critical data** - Don't trust user input, even from UI
2. **Backup before overwrite** - Automatic backups prevent data loss
3. **Multiple layers** - API validation + git hooks + backups

### Infrastructure
1. **Production-like dev** - PM2, auto-restart, health checks even in development
2. **Monitor proactively** - Health endpoints catch issues early
3. **Document requirements** - Explicit requirements prevent assumptions

### Development Practices
1. **Service layer** - Separates concerns, enables testing
2. **Type safety** - TypeScript + tRPC prevents many errors
3. **Test infrastructure** - Invest in testing patterns early

---

## Future Considerations

### Potential Changes
- **Database**: PostgreSQL migration if multi-user or production deployment needed
- **Testing**: Consider Vitest if Jest becomes limiting
- **API**: REST migration if tRPC becomes problematic (unlikely)
- **Deployment**: Docker containerization, CI/CD pipeline

### Patterns to Maintain
- Pre-commit hooks for critical checks
- Configuration protection
- Service layer architecture
- Structured logging
- Health monitoring

---

## Major Migration: Prisma to Drizzle ORM (December 2024)

### Decision: Replace Prisma with Drizzle ORM

**Timeline**: December 18, 2024

**Context**: Prisma had been causing persistent issues:
- Testing complexity with adapter initialization
- Prisma 7 adapter system added complexity
- Mocking difficulties in test environment
- Large bundle size
- Migration tool complexity

**Decision**: Complete migration from Prisma to Drizzle ORM

**Rationale**:
- **Simpler Testing**: Drizzle works directly with better-sqlite3, no adapter issues
- **Lighter Weight**: ~90% smaller bundle size than Prisma
- **Better TypeScript**: Native TypeScript-first design with better inference
- **More Control**: Direct SQL access when needed, less abstraction
- **Active Development**: Modern, well-maintained, growing ecosystem

**Migration Approach**:
- **Delete and Recreate**: Rather than edit existing code, rewrote from requirements
- **Schema Conversion**: Converted Prisma schema to Drizzle schema definitions
- **Complete Rewrite**: All routers, API routes, services, and tests rewritten
- **Test Infrastructure**: Updated test utilities to use Drizzle's in-memory database

**Files Changed**:
- Created `src/server/schema.ts` - Drizzle schema definitions
- Rewrote `src/server/db.ts` - Drizzle database connection
- Rewrote all 8 tRPC routers
- Rewrote all 21 REST API routes
- Updated all service files using database
- Updated all test utilities and test files
- Removed Prisma dependencies from `package.json`
- Deleted Prisma schema and migration files

**Benefits Realized**:
- ✅ No more adapter initialization errors in tests
- ✅ Real in-memory databases work perfectly for testing
- ✅ Simpler, more maintainable code
- ✅ Better TypeScript inference
- ✅ Faster test execution

**Tradeoffs**:
- Lost Prisma's migration history (kept for reference)
- Need to use Drizzle Kit for migrations going forward
- Some API route tests need updates (mocks still expect Prisma-style API)

**Pattern Established**: When a tool causes persistent pain, consider alternatives. Sometimes a complete migration is cleaner than incremental fixes.

---

## Error Handling Improvements (December 2025)

### Link Router Error Handling Refactoring
**Decision**: Implement production-ready error handling patterns in the link router

**Context**: The link router had been using temporary workarounds for Drizzle relation errors, with `error: any` types, `console.error` logging, and unsafe non-null assertions. An assessment revealed multiple maturity issues.

**Changes Implemented**:
1. **Type Safety**: Replaced `error: any` with `error: unknown` and proper type checking
2. **Structured Logging**: Replaced `console.error` with `logServiceError` for consistent logging
3. **Specific Error Catching**: Only catch specific Drizzle relation errors, re-throw unexpected errors
4. **Removed Unsafe Assertions**: Replaced `fullLink!` with proper validation
5. **Fallback Error Handling**: Added error handling for fallback paths
6. **Standardized Patterns**: All methods use optimized batched queries (3 queries) instead of N+1

**Helper Function**: Created `isDrizzleRelationError()` to identify specific Drizzle relation errors that should trigger fallback:
- `referencedTable` errors
- `relation` errors  
- `Cannot read properties of undefined` errors

**Error Handling Pattern**:
```typescript
try {
  // Try Drizzle relational API
} catch (error: unknown) {
  if (!isDrizzleRelationError(error)) {
    // Re-throw unexpected errors with proper logging
    logServiceError(error, "operation", { context });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", ... });
  }
  
  // Use fallback for expected errors
  try {
    // Optimized batched fallback
  } catch (fallbackError: unknown) {
    // Both paths failed - log and throw
  }
}
```

**Impact**: 
- Improved type safety and error visibility
- Better debugging with structured logs
- Prevents masking of critical errors
- Consistent error handling across all link operations
- Production-ready error handling patterns

**Files Modified**:
- `src/server/api/routers/link.ts` - Complete error handling refactor
- `src/test/link.test.ts` - Updated tests to match new patterns
- `docs/error-handling-assessment.md` - Detailed assessment and recommendations
- `docs/error-handling-improvements.md` - Implementation summary

**Pattern Established**: Error handling should be assessed for maturity and best practices. Type safety, structured logging, and specific error catching are essential for production code.

---

---

## Hydration Error Fix (January 2025)

### Browser Extension Hydration Mismatch
**Issue**: React hydration warning for `cz-shortcut-listen="true"` attribute

**Root Cause**: Browser extension (likely ColorZilla) injecting attributes into `<body>` tag after server render but before React hydration.

**Solution**: Added `suppressHydrationWarning` to `<body>` tag in `src/app/layout.tsx`

**Analysis**:
- ✅ All components using `Date.now()`/`Math.random()` are `"use client"` - no SSR issues
- ✅ No server/client code mismatches found
- ✅ Warning is purely from browser extension, not our code
- ✅ `suppressHydrationWarning` is the recommended React solution for this scenario

**Files Modified**:
- `src/app/layout.tsx` - Added `suppressHydrationWarning` to body tag

**Pattern Established**: Use `suppressHydrationWarning` for unavoidable external factors (browser extensions), but verify no actual code bugs are being hidden.

---

**Last Updated**: December 20, 2025

*This document is maintained as an ongoing narrative. Major changes, decisions, and incidents should be added here to preserve institutional memory.*
