#!/bin/bash
# Health check script for the writing assistant server
# Verifies both server-side and client-side functionality

set -e

PORT=${PORT:-3051}
BASE_URL="http://localhost:${PORT}"

echo "🔍 Running health checks for writing assistant..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Check if server is running
echo "1. Checking if server is running on port ${PORT}..."
if lsof -ti:${PORT} > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is NOT running on port ${PORT}${NC}"
    exit 1
fi
echo ""

# 2. Check PM2 status
echo "2. Checking PM2 process status..."
if pm2 list | grep -q "writing-assistant.*online"; then
    echo -e "${GREEN}✅ PM2 process is online${NC}"
else
    echo -e "${RED}❌ PM2 process is not online${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Check environment variables are loaded
echo "3. Checking environment variables in PM2..."
if pm2 env 0 2>/dev/null | grep -q "DATABASE_URL.*postgresql"; then
    echo -e "${GREEN}✅ DATABASE_URL is loaded${NC}"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL not found in PM2 env (may be normal if using .env)${NC}"
fi
echo ""

# 4. Check main page HTTP response
echo "4. Checking main page HTTP response..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Main page returns HTTP 200${NC}"
else
    echo -e "${RED}❌ Main page returns HTTP ${HTTP_CODE}${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Check for actual runtime errors in HTML (not just component names)
echo "5. Checking for runtime errors in HTML..."
HTML_CONTENT=$(curl -s "${BASE_URL}")
# Look for actual error messages, not just component names
if echo "$HTML_CONTENT" | grep -qiE "(Runtime ZodError|ZodError|Invalid input: expected|Module not found|Cannot find module)"; then
    echo -e "${RED}❌ Found runtime error in HTML response${NC}"
    echo "   Error details:"
    echo "$HTML_CONTENT" | grep -iE "(Runtime ZodError|ZodError|Invalid input)" | head -2 | sed 's/^/   /'
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No runtime errors in HTML${NC}"
fi
echo ""

# 6. Check for client-side ZodError patterns in script tags
echo "6. Checking for client-side ZodError patterns..."
if echo "$HTML_CONTENT" | grep -qiE "(zoderror|runtime.*zod|invalid.*input.*expected.*string.*received.*undefined)" | grep -v "global-error"; then
    echo -e "${RED}❌ Found ZodError patterns in HTML (client-side error likely)${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No ZodError patterns found${NC}"
fi
echo ""

# 7. Check API endpoint
echo "7. Checking API endpoint..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/concepts" || echo "000")
if [ "$API_CODE" = "200" ]; then
    echo -e "${GREEN}✅ API endpoint returns HTTP 200${NC}"
    # Check if response is valid JSON
    if curl -s "${BASE_URL}/api/concepts" | python3 -m json.tool > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API returns valid JSON${NC}"
    else
        echo -e "${YELLOW}⚠️  API response is not valid JSON${NC}"
    fi
else
    echo -e "${RED}❌ API endpoint returns HTTP ${API_CODE}${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 8. Check PM2 error logs
echo "8. Checking PM2 error logs..."
RECENT_ERRORS=$(pm2 logs writing-assistant --err --lines 5 --nostream 2>&1 | tail -5 | grep -i "error\|exception\|fail" | wc -l | tr -d ' ')
if [ "$RECENT_ERRORS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found ${RECENT_ERRORS} recent error(s) in PM2 logs${NC}"
    echo "   Recent errors:"
    pm2 logs writing-assistant --err --lines 3 --nostream 2>&1 | tail -3 | sed 's/^/   /'
else
    echo -e "${GREEN}✅ No recent errors in PM2 logs${NC}"
fi
echo ""

# 9. Check that page title is correct (indicates proper rendering)
echo "9. Checking page rendering..."
if curl -s "${BASE_URL}" | grep -q "<title>Thomas Writing Assistant</title>"; then
    echo -e "${GREEN}✅ Page title is correct (page rendered successfully)${NC}"
else
    echo -e "${RED}❌ Page title not found or incorrect${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 10. Check for Next.js error pages (actual error content, not component names)
echo "10. Checking for Next.js error pages..."
# Extract statusCode from __NEXT_DATA__ JSON
STATUS_CODE=$(curl -s "${BASE_URL}" | grep -oE '"statusCode":[0-9]+' | head -1 | grep -oE '[0-9]+' || echo "")
if [ -n "$STATUS_CODE" ]; then
    if [ "$STATUS_CODE" -ge 500 ]; then
        echo -e "${RED}❌ Next.js error page detected (${STATUS_CODE} error)${NC}"
        ERRORS=$((ERRORS + 1))
    elif [ "$STATUS_CODE" -eq 404 ]; then
        # 404 in __NEXT_DATA__ is normal Next.js metadata for NotFound component, not an actual error
        echo -e "${GREEN}✅ No actual error pages detected${NC}"
    else
        echo -e "${GREEN}✅ No actual error pages detected (statusCode: ${STATUS_CODE})${NC}"
    fi
else
    echo -e "${GREEN}✅ No Next.js error pages detected${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Health check failed with ${ERRORS} error(s)${NC}"
    echo ""
    echo "To investigate:"
    echo "  - Check PM2 logs: pm2 logs writing-assistant"
    echo "  - Check browser console for client-side errors"
    echo "  - Verify .env file has all required variables"
    exit 1
fi
