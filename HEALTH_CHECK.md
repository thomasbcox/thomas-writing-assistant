# Health Check Script

## Overview

The health check script (`scripts/health-check.sh`) provides comprehensive verification that the server is running correctly. It checks both server-side and client-side functionality to catch issues that might not be obvious from simple HTTP status checks.

## Usage

```bash
npm run health:check
```

## What It Checks

1. **Server Process**: Verifies the server is running on port 3051
2. **PM2 Status**: Confirms PM2 process is online
3. **Environment Variables**: Checks that DATABASE_URL is loaded in PM2
4. **HTTP Response**: Verifies main page returns HTTP 200
5. **Runtime Errors**: Scans HTML for actual runtime errors (ZodError, etc.)
6. **Client-Side Errors**: Checks for client-side ZodError patterns
7. **API Endpoints**: Tests API endpoints return valid JSON
8. **PM2 Logs**: Checks for recent errors in PM2 error logs
9. **Page Rendering**: Verifies page title is correct (indicates proper rendering)
10. **Error Pages**: Detects Next.js error pages (5xx errors)

## Why This Matters

Previously, we only checked:
- ✅ HTTP status code (200)
- ✅ Port is listening

But we missed:
- ❌ Client-side runtime errors (ZodError when env.ts runs in browser)
- ❌ Actual error content in HTML
- ❌ API endpoint functionality

The health check now catches these issues before they reach the user.

## Integration

The health check should be run:
- After starting the server
- After making configuration changes
- As part of CI/CD pipelines
- When troubleshooting issues

## Exit Codes

- `0`: All checks passed
- `1`: One or more checks failed
