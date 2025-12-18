# Database Record Counts

## How to Get Record Counts

### Option 1: API Endpoint (Recommended)
Visit or curl the admin endpoint:
```bash
curl http://localhost:3051/api/admin/db-stats | jq
```

Or use the helper script:
```bash
./scripts/show-db-counts.sh
```

### Option 2: Direct Database Query
If you have direct database access:
```sql
SELECT 
  'Concept' as table_name, COUNT(*) as count FROM "Concept"
UNION ALL
SELECT 'Link', COUNT(*) FROM "Link"
UNION ALL
SELECT 'Capsule', COUNT(*) FROM "Capsule"
UNION ALL
SELECT 'Anchor', COUNT(*) FROM "Anchor"
UNION ALL
SELECT 'RepurposedContent', COUNT(*) FROM "RepurposedContent"
UNION ALL
SELECT 'LinkName', COUNT(*) FROM "LinkName"
UNION ALL
SELECT 'MRUConcept', COUNT(*) FROM "MRUConcept";
```

## Database Tables

| Table | Description | UI Display Location |
|-------|-------------|---------------------|
| **Concept** | Core knowledge base concepts | Concepts Tab → ConceptList component |
| **Link** | Relationships between concepts | Links Tab → LinksTab component |
| **Capsule** | Content capsules (Jana Osofsky strategy) | Capsules Tab → CapsuleList component |
| **Anchor** | Anchor posts within capsules | Capsules Tab → AnchorCard component |
| **RepurposedContent** | Repurposed content from anchors | Capsules Tab → DerivativeList component |
| **LinkName** | Custom link relationship names | Links Tab → LinkNameManager component |
| **MRUConcept** | Most recently used concepts (internal) | No UI (internal tracking) |

## UX Data Display Verification

✅ **All user-facing tables have UI components that can display their data.**

See `UX_DATA_DISPLAY_VERIFICATION.md` for detailed verification of:
- Which components display each table's data
- How data flows from database → API → React Query hooks → UI components
- CRUD operations available for each table

## Quick Verification

To verify the UI can display your data:

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Check record counts:**
   ```bash
   curl http://localhost:3051/api/admin/db-stats | jq '.counts'
   ```

3. **Verify in UI:**
   - **Concepts Tab**: Should show all concepts from `Concept` table
   - **Links Tab**: Should show all links from `Link` table
   - **Capsules Tab**: Should show all capsules, anchors, and repurposed content
   - **Blog Posts Tab**: Should show concepts in the selection dropdown

4. **Test data flow:**
   - Create a new concept → Should appear in Concepts Tab
   - Create a link → Should appear in Links Tab
   - Create a capsule → Should appear in Capsules Tab
   - All operations should persist to database and be visible on page refresh

## API Endpoints for Each Table

| Table | GET Endpoint | POST Endpoint | PUT Endpoint | DELETE Endpoint |
|-------|--------------|---------------|--------------|-----------------|
| Concept | `/api/concepts` | `/api/concepts` | `/api/concepts/[id]` | `/api/concepts/[id]` |
| Link | `/api/links` | `/api/links` | N/A | `/api/links/[sourceId]/[targetId]` |
| Capsule | `/api/capsules` | `/api/capsules` | N/A* | N/A* |
| Anchor | `/api/capsules/[id]` (included) | `/api/capsules/[id]/anchors` | `/api/capsules/[id]/anchors/[anchorId]` | `/api/capsules/[id]/anchors/[anchorId]` |
| RepurposedContent | `/api/capsules/[id]` (included) | `/api/capsules/[id]/anchors/[anchorId]/repurposed` | `/api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId]` | `/api/capsules/[id]/anchors/[anchorId]/repurposed/[repurposedId]` |
| LinkName | `/api/link-names` | `/api/link-names` | `/api/link-names/[name]` | `/api/link-names/[name]` |

*Capsules are intentionally immutable (no PUT/DELETE) - only anchors and repurposed content are modified.
