# Prisma Migration Analysis

**Date**: 2025-12-18  
**Question**: Can we safely drop Prisma from the tech stack?

## Current Prisma Usage

### Scope
- **125 usages** across **31 files**
- **7 database models**: Concept, Link, LinkName, Capsule, Anchor, RepurposedContent, MRUConcept
- **Primary locations**:
  - All tRPC routers (8 files)
  - All REST API routes (15+ files)
  - Test utilities
  - Services layer

### Current Pain Points
1. **Testing Complexity**: Adapter initialization issues, mocking difficulties
2. **Prisma 7 Changes**: New adapter system adds complexity
3. **Bundle Size**: Prisma client is large
4. **Migration Tool**: Prisma migrations can be finicky
5. **Type Generation**: Generated types can be slow

## Recommendation: **YES, Drop Prisma** ✅

### Why It's Safe
1. **Simple Schema**: Only 7 models, straightforward relationships
2. **SQLite**: No complex SQL features needed
3. **Well-Defined API**: All database access is in routers/services (not scattered)
4. **TypeScript**: Can maintain type safety with alternatives

### Best Replacement: **Drizzle ORM**

**Why Drizzle?**
- ✅ **TypeScript-first**: Better type inference than Prisma
- ✅ **Simpler Testing**: No adapter issues, easy to mock
- ✅ **Lighter**: ~10x smaller bundle size
- ✅ **SQLite Native**: Works directly with better-sqlite3
- ✅ **Similar API**: Migration will be straightforward
- ✅ **Better Control**: You write SQL when needed
- ✅ **Active Development**: Modern, well-maintained

**Alternatives Considered**:
- **Raw SQL + better-sqlite3**: Too much boilerplate, lose type safety
- **TypeORM**: Heavier than Prisma, more complex
- **Kysely**: Good but more SQL-focused (less ORM-like)

## Migration Strategy

### Phase 1: Setup Drizzle (1-2 hours)
1. Install Drizzle packages
2. Create schema definitions (convert from Prisma)
3. Set up database connection
4. Create migration tooling

### Phase 2: Migrate Core Models (4-6 hours)
1. Start with simplest models (LinkName, MRUConcept)
2. Migrate Concept model
3. Migrate Link model
4. Migrate Capsule/Anchor/RepurposedContent

### Phase 3: Update Code (6-8 hours)
1. Update tRPC routers (8 files)
2. Update REST API routes (15 files)
3. Update services layer
4. Update test utilities

### Phase 4: Testing & Cleanup (2-3 hours)
1. Update all tests
2. Remove Prisma dependencies
3. Clean up old migrations
4. Update documentation

**Total Estimated Time**: 13-19 hours (1.5-2.5 days)

## Code Comparison

### Current (Prisma)
```typescript
// src/server/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: dbPath });
export const db = new PrismaClient({ adapter });

// Usage
const concepts = await ctx.db.concept.findMany({
  where: { status: "active" },
  include: { outgoingLinks: { include: { target: true } } },
});
```

### With Drizzle
```typescript
// src/server/db.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Usage
const concepts = await db.query.concept.findMany({
  where: eq(concept.status, "active"),
  with: { outgoingLinks: { with: { target: true } } },
});
```

### Testing Comparison

**Current (Prisma) - Problematic**:
```typescript
// Complex mocking, adapter issues
jest.mock("~/server/db", () => ({
  db: { concept: { findMany: jest.fn() } }
}));
```

**With Drizzle - Simple**:
```typescript
// Direct SQLite in-memory database
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

const testDb = drizzle(new Database(":memory:"), { schema });
// No mocking needed - use real in-memory DB!
```

## Migration Steps (Detailed)

### Step 1: Install Drizzle
```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit
```

### Step 2: Create Drizzle Schema
Convert Prisma schema to Drizzle:

```typescript
// src/server/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const concept = sqliteTable("Concept", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  identifier: text("identifier").unique().notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  content: text("content").notNull(),
  creator: text("creator").notNull(),
  source: text("source").notNull(),
  year: text("year").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$onUpdate(() => new Date()),
  trashedAt: integer("trashedAt", { mode: "timestamp" }),
});

export const conceptRelations = relations(concept, ({ many }) => ({
  outgoingLinks: many(link, { relationName: "SourceConcept" }),
  incomingLinks: many(link, { relationName: "TargetConcept" }),
}));
```

### Step 3: Update Database Connection
```typescript
// src/server/db.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { env } from "~/env";

const dbPath = env.DATABASE_URL.replace("file:", "");
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
```

### Step 4: Migrate One Router at a Time
Start with the simplest (LinkName), then work up to more complex ones.

## Benefits After Migration

1. **Testing**: 
   - No adapter issues
   - Real in-memory databases work perfectly
   - No complex mocking needed

2. **Performance**:
   - Smaller bundle size (~90% reduction)
   - Faster startup (no client generation)
   - Direct SQLite access

3. **Developer Experience**:
   - Simpler setup
   - Better TypeScript inference
   - More control over queries
   - Easier debugging

4. **Maintenance**:
   - Fewer dependencies
   - Less abstraction
   - Clearer code

## Risks & Mitigations

### Risk 1: Data Migration
**Mitigation**: 
- Drizzle can read existing SQLite database
- Write migration script to copy data
- Test on copy of production data first

### Risk 2: Breaking Changes
**Mitigation**:
- Migrate one router at a time
- Keep Prisma code until Drizzle version is tested
- Run both in parallel during transition

### Risk 3: Learning Curve
**Mitigation**:
- Drizzle API is similar to Prisma
- Good documentation
- TypeScript types help

## Recommendation: **Proceed with Migration**

Given:
- ✅ Simple schema (7 models)
- ✅ SQLite (no complex features)
- ✅ Testing pain points with Prisma
- ✅ Well-contained database access
- ✅ TypeScript project (Drizzle fits perfectly)

**The migration is safe and will solve your testing issues while simplifying the codebase.**

## Next Steps

If you want to proceed, I can:
1. Create the Drizzle schema definitions
2. Set up the new database connection
3. Migrate one router as a proof of concept
4. Show you the testing improvements

Would you like me to start the migration?
