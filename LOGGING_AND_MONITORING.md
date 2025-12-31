# Logging and Monitoring Status

*Last Updated: December 30, 2025*

## Current Logging Coverage

### ✅ Well-Logged Areas

**Service Layer (Excellent):**
- All service operations log start/completion
- Full context included (inputs, outputs, timing)
- Errors logged with stack traces
- Operation names clearly identified

**Error Handling:**
- All errors go through `logServiceError()` or `handleApiError()`
- Stack traces preserved
- Service/operation context included

**IPC Handlers (Complete):**
- ✅ Concept operations (list, getById, create, update, delete, restore, purgeTrash, proposeLinks, generateCandidates)
- ✅ Link operations (getAll, getByConcept, create, delete)
- ✅ Capsule operations (list, getById, create, createAnchorFromPDF)
- ✅ PDF operations (extractText)
- ✅ Enrichment operations (analyze, enrichMetadata, chat, expandDefinition)
- ✅ Offer operations (list, getById, create, update, delete, assignCapsule, getUnassignedCapsules)
- ✅ Chat operations (createSession, getSessionsByConceptId, getSessionById, deleteSession, addMessage, getOrCreateSession)

**Client-Side Logging:**
- ✅ useIPC hook error logging (queries and mutations)
- ✅ Console error logging in browser/renderer environments

### ⚠️ Remaining Gaps

**Not Yet Implemented:**
- 🔴 Request correlation IDs for distributed tracing
- 🔴 Operation timing/metrics for performance monitoring
- 🔴 Anchor CRUD operations (updateAnchor, deleteAnchor) - Note: These may be handled via capsule handlers

## AI Agent Logging Checklist

When debugging, the AI agent MUST check:

1. **PM2 Logs** - `pm2 logs writing-assistant --lines 100`
2. **Error Logs** - `pm2 logs writing-assistant --err --lines 50`
3. **Application Logs** - `tail -100 logs/app.log` (if file logging enabled)
4. **Health Check** - `npm run health:check`
5. **Database State** - Direct queries to verify data
6. **Environment Variables** - `pm2 env 0`
7. **API Responses** - Test endpoints directly with curl

## What Was Missing (And Fixed)

### Before:
- ❌ API routes only logged errors, not successful operations
- ❌ No visibility into database operations
- ❌ No logging when concepts were created/updated/deleted
- ❌ AI agent wasn't checking logs systematically

### After:
- ✅ Concept operations now logged
- ✅ Operation context included
- ✅ AI agent debugging guide created
- ✅ Systematic checklist for debugging

## Recommendations

1. ~~**Add logging to remaining API routes** (links, capsules, anchors)~~ ✅ DONE (December 30, 2025)
2. ~~**Add logging to enrichment, offer, and chat handlers**~~ ✅ DONE (December 30, 2025)
3. ~~**Add client-side error logging** to useIPC hook~~ ✅ DONE (December 30, 2025)
4. **Add request correlation IDs** for request tracing
5. **Add operation timing** for performance monitoring
6. **Set up log aggregation** for easier analysis
7. **Create log alerts** for critical errors










