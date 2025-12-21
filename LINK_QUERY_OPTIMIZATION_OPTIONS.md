# Link Query Optimization Options

## Current Problem
The current implementation uses N+1 queries (one query per link for each relation), which is inefficient and not best practice.

## Option 1: Fix Drizzle Relational Query API (Recommended)
**Why it's better:** Uses Drizzle's built-in relational queries, which are optimized and type-safe.

```typescript
// In src/server/api/routers/link.ts
getAll: publicProcedure
  .input(z.object({ summary: z.boolean().optional().default(false) }).optional())
  .query(async ({ ctx, input }) => {
    const summaryOnly = input?.summary ?? false;

    if (summaryOnly) {
      const links = await ctx.db
        .select({ 
          id: link.id,
          sourceId: link.sourceId,
          targetId: link.targetId,
        })
        .from(link)
        .orderBy(desc(link.createdAt));
      return links;
    }

    // Use Drizzle's relational query API (like capsule router does)
    const links = await ctx.db.query.link.findMany({
      with: {
        source: true,
        target: true,
        linkName: true,
      },
      orderBy: [desc(link.createdAt)],
    });

    return links;
  }),

getByConcept: publicProcedure
  .input(z.object({ conceptId: z.string() }))
  .query(async ({ ctx, input }) => {
    const outgoing = await ctx.db.query.link.findMany({
      where: eq(link.sourceId, input.conceptId),
      with: {
        source: true,
        target: true,
        linkName: true,
      },
    });

    const incoming = await ctx.db.query.link.findMany({
      where: eq(link.targetId, input.conceptId),
      with: {
        source: true,
        target: true,
        linkName: true,
      },
    });

    return { outgoing, incoming };
  }),
```

**Pros:**
- Single optimized query per request
- Type-safe
- Uses Drizzle's built-in optimizations
- Consistent with capsule router pattern

**Cons:**
- Requires relations to be properly configured (they are)
- May need to verify Drizzle version compatibility

---

## Option 2: Use SQL Joins with Drizzle Select API
**Why it's better:** Explicit SQL joins are efficient and give full control over the query.

```typescript
import { eq, desc } from "drizzle-orm";
import { link, concept, linkName } from "~/server/schema";

getAll: publicProcedure
  .input(z.object({ summary: z.boolean().optional().default(false) }).optional())
  .query(async ({ ctx, input }) => {
    const summaryOnly = input?.summary ?? false;

    if (summaryOnly) {
      return await ctx.db
        .select({ 
          id: link.id,
          sourceId: link.sourceId,
          targetId: link.targetId,
        })
        .from(link)
        .orderBy(desc(link.createdAt));
    }

    // Single query with joins
    const links = await ctx.db
      .select({
        id: link.id,
        sourceId: link.sourceId,
        targetId: link.targetId,
        linkNameId: link.linkNameId,
        notes: link.notes,
        createdAt: link.createdAt,
        source: {
          id: concept.id,
          title: concept.title,
        },
        target: {
          id: concept.id,
          title: concept.title,
        },
        linkName: {
          id: linkName.id,
          forwardName: linkName.forwardName,
          reverseName: linkName.reverseName,
          isSymmetric: linkName.isSymmetric,
        },
      })
      .from(link)
      .leftJoin(concept, eq(link.sourceId, concept.id))
      .leftJoin(concept, eq(link.targetId, concept.id)) // This won't work - need aliases
      .leftJoin(linkName, eq(link.linkNameId, linkName.id))
      .orderBy(desc(link.createdAt));

    // Better: Use separate queries for source/target or use aliases
    // For SQLite, we need to join concept twice with aliases
    const linksWithSource = await ctx.db
      .select({
        link: link,
        source: concept,
      })
      .from(link)
      .leftJoin(concept, eq(link.sourceId, concept.id))
      .orderBy(desc(link.createdAt));

    // Then join target and linkName in separate queries or use subqueries
    // This gets complex - Option 1 is cleaner
  }),
```

**Pros:**
- Full control over SQL
- Can optimize joins explicitly
- Single query (if done right)

**Cons:**
- More verbose
- Need to handle duplicate column names (source.id vs target.id)
- Requires aliases for multiple joins to same table
- Less type-safe

---

## Option 3: Batch Load Relations (DataLoader Pattern)
**Why it's better:** Efficiently batches multiple relation loads into single queries.

```typescript
// Helper function to batch load relations
async function loadLinkRelations(
  db: ReturnType<typeof import("~/server/db").db>,
  links: Array<{ sourceId: string; targetId: string; linkNameId: string }>
) {
  // Collect all unique IDs
  const sourceIds = [...new Set(links.map(l => l.sourceId))];
  const targetIds = [...new Set(links.map(l => l.targetId))];
  const linkNameIds = [...new Set(links.map(l => l.linkNameId))];

  // Batch load all relations in parallel
  const [sources, targets, linkNames] = await Promise.all([
    db.select().from(concept).where(inArray(concept.id, sourceIds)),
    db.select().from(concept).where(inArray(concept.id, targetIds)),
    db.select().from(linkName).where(inArray(linkName.id, linkNameIds)),
  ]);

  // Create lookup maps
  const sourceMap = new Map(sources.map(c => [c.id, c]));
  const targetMap = new Map(targets.map(c => [c.id, c]));
  const linkNameMap = new Map(linkNames.map(ln => [ln.id, ln]));

  // Attach relations to links
  return links.map(linkRecord => ({
    ...linkRecord,
    source: sourceMap.get(linkRecord.sourceId) || null,
    target: targetMap.get(linkRecord.targetId) || null,
    linkName: linkNameMap.get(linkRecord.linkNameId) || null,
  }));
}

// In router:
getAll: publicProcedure
  .input(z.object({ summary: z.boolean().optional().default(false) }).optional())
  .query(async ({ ctx, input }) => {
    const summaryOnly = input?.summary ?? false;

    if (summaryOnly) {
      return await ctx.db
        .select({ 
          id: link.id,
          sourceId: link.sourceId,
          targetId: link.targetId,
        })
        .from(link)
        .orderBy(desc(link.createdAt));
    }

    const linksData = await ctx.db
      .select()
      .from(link)
      .orderBy(desc(link.createdAt));

    return await loadLinkRelations(ctx.db, linksData);
  }),
```

**Pros:**
- Only 4 queries total (1 for links, 1 for sources, 1 for targets, 1 for linkNames)
- Efficient batching
- Works with any ORM
- Easy to cache/memoize

**Cons:**
- More code to maintain
- Manual relation mapping
- Still more queries than Option 1

---

## Recommendation: Option 1

Option 1 is the cleanest because:
1. **Uses Drizzle's intended API** - The relational query API is designed for this
2. **Single query** - Drizzle optimizes this internally
3. **Type-safe** - Full TypeScript support
4. **Consistent** - Matches the pattern used in `capsule.ts`
5. **Less code** - Most concise solution

The issue is likely that the relational query API wasn't working before, but it should work now that relations are properly configured. If it still doesn't work, we should debug why rather than work around it.
