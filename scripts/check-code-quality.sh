#!/bin/bash

# Code Quality Check Script
# Run this periodically to check for code quality issues

set -e

echo "🔍 Running Code Quality Checks..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. TypeScript Type Check
echo "1️⃣  Checking TypeScript types..."
if npx tsc --noEmit 2>&1 | tee /tmp/tsc-errors.log | grep -q "error TS"; then
  echo -e "${RED}❌ TypeScript errors found${NC}"
  ERRORS=$((ERRORS + 1))
  echo "   Run: npx tsc --noEmit to see details"
else
  echo -e "${GREEN}✅ No TypeScript errors${NC}"
fi
echo ""

# 2. Check for 'any' types
echo "2️⃣  Checking for 'any' types..."
ANY_COUNT=$(grep -r ": any\|as any\|any\[" src --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $ANY_COUNT 'any' types${NC}"
  WARNINGS=$((WARNINGS + 1))
  echo "   Run: grep -r ': any\\|as any' src to see details"
else
  echo -e "${GREEN}✅ No 'any' types found${NC}"
fi
echo ""

# 3. Check for console statements
echo "3️⃣  Checking for console statements..."
CONSOLE_COUNT=$(grep -r "console\\.log\\|console\\.error\\|console\\.warn" src --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "node_modules" | grep -v "logger" | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $CONSOLE_COUNT console statements${NC}"
  WARNINGS=$((WARNINGS + 1))
  echo "   Run: grep -r 'console\\.' src to see details"
else
  echo -e "${GREEN}✅ No console statements found${NC}"
fi
echo ""

# 4. Check for unsafe JSON parsing
echo "4️⃣  Checking for unsafe JSON.parse()..."
JSON_PARSE_COUNT=$(grep -r "JSON\\.parse" src --include="*.ts" --include="*.tsx" | grep -v "try" | grep -v "catch" | grep -v "test" | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$JSON_PARSE_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $JSON_PARSE_COUNT unsafe JSON.parse() calls${NC}"
  WARNINGS=$((WARNINGS + 1))
  echo "   Run: grep -r 'JSON\\.parse' src to see details"
else
  echo -e "${GREEN}✅ No unsafe JSON.parse() found${NC}"
fi
echo ""

# 5. Check for large files
echo "5️⃣  Checking for large files (>500 lines)..."
LARGE_FILES=$(find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 500 {print $2}' | grep -v node_modules | wc -l | tr -d ' ')
if [ "$LARGE_FILES" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $LARGE_FILES large files${NC}"
  WARNINGS=$((WARNINGS + 1))
  echo "   Run: find src -name '*.ts*' | xargs wc -l | sort -rn | head -10"
else
  echo -e "${GREEN}✅ No overly large files${NC}"
fi
echo ""

# 6. ESLint check
echo "6️⃣  Running ESLint..."
if npm run lint 2>&1 | grep -q "error"; then
  echo -e "${RED}❌ ESLint errors found${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No ESLint errors${NC}"
fi
echo ""

# 7. Test suite
echo "7️⃣  Running tests..."
if npm test -- --passWithNoTests 2>&1 | grep -q "FAIL"; then
  echo -e "${RED}❌ Tests failing${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ All tests passing${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  exit 0
elif [ "$ERRORS" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  $WARNINGS warnings found${NC}"
  exit 0
else
  echo -e "${RED}❌ $ERRORS errors and $WARNINGS warnings found${NC}"
  exit 1
fi

