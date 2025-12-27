# AI Agent Debugging Guide

## Overview

This guide documents what an AI agent should check when debugging issues in the writing assistant application.

## Critical Debugging Checklist

When investigating any issue, the AI agent MUST:

### 1. Check Server Status
```bash
pm2 status
pm2 logs writing-assistant --lines 50 --nostream
```
- Verify server is running
- Check for immediate errors in logs
- Look for crash/restart patterns

### 2. Check Application Health
```bash
npm run health:check
```
- Run comprehensive health check
- Verify HTTP responses
- Check for runtime errors in HTML
- Verify API endpoints return valid JSON

### 3. Check PM2 Error Logs
```bash
pm2 logs writing-assistant --err --lines 100 --nostream
```
- Look for error patterns
- Check for database connection errors
- Look for module resolution errors
- Check for environment variable issues

### 4. Check Application Logs
```bash
# If using file-based logging
tail -100 logs/app.log

# Check PM2 combined logs
pm2 logs writing-assistant --lines 200 --nostream | grep -i "error\|exception\|fail"
```
- Look for structured error logs
- Check service-level errors
- Verify operation context

### 5. Verify Environment Variables
```bash
pm2 env 0 | grep -E "DATABASE_URL|NODE_ENV|.*API_KEY"
```
- Ensure all required env vars are loaded
- Verify DATABASE_URL is set correctly
- Check API keys are present

### 6. Test API Endpoints Directly
```bash
# Test main page
curl -s http://localhost:3051 | grep -i "error\|zod" || echo "OK"

# Test API endpoints
curl -s http://localhost:3051/api/concepts | python3 -m json.tool || echo "Invalid JSON"
```
- Verify endpoints return valid responses
- Check for error messages in responses
- Validate JSON structure

### 7. Check Database State
```bash
# Count records
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Concept\";"

# Check recent operations
psql $DATABASE_URL -c "SELECT id, title, \"createdAt\" FROM \"Concept\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```
- Verify data exists
- Check for unexpected data loss
- Verify recent operations completed

### 8. Check Browser Console (if applicable)
- Client-side errors won't appear in server logs
- Check for ZodError, runtime errors
- Look for network request failures

## Logging Coverage Analysis

### ✅ Well-Logged Operations

**Service Layer:**
- ✅ Concept generation (`conceptProposer.ts`) - Full logging with context
- ✅ Link proposal (`linkProposer.ts`) - Logged with reasoning
- ✅ Concept enrichment (`conceptEnricher.ts`) - Comprehensive logging
- ✅ Repurposing (`repurposer.ts`) - Full operation logging
- ✅ Anchor extraction (`anchorExtractor.ts`) - Logged with metadata
- ✅ LLM operations - Provider, model, and errors logged

**Error Handling:**
- ✅ All service errors use `logServiceError()` with full context
- ✅ API route errors logged via `handleApiError()`
- ✅ Stack traces included in error logs

### ⚠️ Needs Improvement

**API Routes:**
- ⚠️ Successful operations NOT logged (only errors)
- ⚠️ Database operations (create/update/delete) not logged
- ⚠️ Request context (user, IP, etc.) not captured
- ⚠️ Operation timing not logged

**Current State:**
- Only errors are logged in API routes
- Successful database operations are silent
- No request correlation IDs
- No performance metrics

### 🔴 Missing Logging

**Critical Operations:**
- 🔴 Concept creation - NOW ADDED ✅
- 🔴 Concept updates - NOW ADDED ✅
- 🔴 Concept deletion - NOW ADDED ✅
- 🔴 Link creation/deletion
- 🔴 Capsule/anchor operations
- 🔴 PDF processing start/completion

## What the AI Agent Should Do

### When Debugging Issues:

1. **ALWAYS check PM2 logs first** - Don't assume server is working
   ```bash
   pm2 logs writing-assistant --lines 100 --nostream
   pm2 logs writing-assistant --err --lines 50 --nostream
   ```

2. **ALWAYS run health check** - Catches issues HTTP 200 doesn't reveal
   ```bash
   npm run health:check
   ```

3. **ALWAYS check error logs** - Not just status
   ```bash
   pm2 logs writing-assistant --err --lines 100
   tail -100 logs/app.log  # If file logging enabled
   ```

4. **ALWAYS verify environment variables** - Common failure point
   ```bash
   pm2 env 0 | grep -E "DATABASE_URL|NODE_ENV"
   ```

5. **ALWAYS test API endpoints** - Don't trust HTTP status codes alone
   ```bash
   curl -s http://localhost:3051/api/concepts | python3 -m json.tool
   curl -s http://localhost:3051 | grep -i "error\|zod"
   ```

6. **ALWAYS check database state** - Verify data exists/operations completed
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Concept\";"
   ```

7. **ALWAYS look for client-side errors** - Check HTML for error patterns
   ```bash
   curl -s http://localhost:3051 | grep -iE "zoderror|runtime.*error"
   ```

### What I Did Wrong Earlier:

❌ **Only checked HTTP status code** - Didn't verify actual response content
❌ **Didn't check PM2 error logs** - Missed runtime errors
❌ **Didn't verify environment variables** - Assumed they were loaded
❌ **Didn't test API endpoints** - Only checked if port was listening
❌ **Didn't check for client-side errors** - Missed ZodError in browser

✅ **Now I will:**
- Run health check script
- Check PM2 error logs systematically
- Verify environment variables are loaded
- Test API endpoints return valid JSON
- Look for error patterns in HTML responses

### When Investigating Data Loss:

1. Check backup directory for recent backups
2. Check database for partial/incomplete records
3. Review logs for transaction failures
4. Check for migration/reset operations
5. Verify database connection stability
6. Check for bulk delete operations in logs

## Logging Best Practices for AI Agents

### What Makes Logs AI-Friendly:

1. **Structured JSON** - Easy to parse and analyze
2. **Full Context** - Operation, IDs, inputs, outputs
3. **Stack Traces** - For error debugging
4. **Correlation IDs** - To trace requests across services
5. **Timing Information** - Performance debugging
6. **Operation Names** - Clear what operation failed

### Current Logger Features:

✅ JSON format in production
✅ Pretty printing in development
✅ Full stack traces on errors
✅ Service/operation context
✅ Error serialization

### Missing Features:

❌ Request correlation IDs
❌ Operation timing/metrics
❌ Success operation logging (only errors)
❌ Database query logging (only in dev mode)

## Recommendations

1. **Add success logging** to all API routes
2. **Add request correlation IDs** for tracing
3. **Log all database operations** (create/update/delete)
4. **Add operation timing** for performance monitoring
5. **Create log aggregation** for easier AI analysis





