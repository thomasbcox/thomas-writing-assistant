# Error Handling Audit

**Last Updated**: 2025-12-11

## Summary

Overall, the codebase uses **good error handling practices**. No empty catch blocks, no console statements in error handlers, and errors are properly logged and propagated.

## ✅ Good Patterns Found

### 1. Service Layer Error Handling
- **`anchorExtractor.ts`**: Logs error with context, then re-throws with descriptive message
- **`repurposer.ts`**: Uses `logServiceError()` helper, logs context, then re-throws
- **`linkProposer.ts`**: Logs error with service context, then re-throws
- **`conceptProposer.ts`**: Similar pattern - logs then re-throws

### 2. API Router Error Handling
- **`config.ts` router**: Catches YAML parsing errors and throws `TRPCError` with proper error codes (`BAD_REQUEST`)
- **`capsule.ts` router**: Proper try/catch with error propagation
- **`pdf.ts` router**: Catches PDF processing errors and throws TRPCError

### 3. Safe Utility Functions
- **`json-utils.ts`**: Safe parsing functions that return defaults - **appropriate** for utility functions where silent failure is desired
  - `safeJsonParseArray()` - Returns empty array on failure
  - `safeJsonParseObject()` - Returns default object on failure
  - `safeJsonStringify()` - Returns default string on failure
  - All log errors properly before returning defaults

### 4. LLM Provider Error Handling
- **`gemini.ts`**: Sophisticated retry logic with model fallbacks
  - Catches 404 errors and tries next model
  - Re-throws non-404 errors immediately
  - Logs each attempt with context
- **`openai.ts`**: Proper error handling with logging

## ⚠️ Potentially Questionable Patterns

### 1. Config Loading Silent Failures
**File**: `src/server/services/config.ts`

```typescript
try {
  const content = fs.readFileSync(styleGuidePath, "utf-8");
  this.styleGuide = (yaml.load(content) as StyleGuide) ?? {};
} catch (error) {
  logger.warn({ err: error, configFile: "style_guide.yaml" }, "Failed to load config file");
  // Continues without the config - might be intentional for graceful degradation
}
```

**Assessment**: This might be intentional to allow the app to start even if config files are missing. However, it silently fails and the app continues with empty configs. Consider:
- Making config files required (throw error)
- Or having explicit default configs
- Or returning a clear error state

**Recommendation**: Review if this is the desired behavior. If graceful degradation is intended, document it clearly.

### 2. Component Error Handling
**File**: `src/components/capsules/PDFUploadSection.tsx`

```typescript
try {
  // ... async operations
} catch (error) {
  setPdfProcessingStatus({ stage: "error" });
  onError?.(`Error processing PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
}
```

**Assessment**: This is **appropriate** for UI components. Errors are caught, state is updated, and user is notified via callback. This is the correct pattern for React components.

## ❌ Anti-Patterns NOT Found

✅ **No empty catch blocks** (`catch {}` or `catch { // }`)
✅ **No console.log/error in catch blocks** - all use proper logger
✅ **No silent error swallowing** - errors are logged and/or re-thrown
✅ **No generic catch-all without context** - all catch blocks have proper error handling

## Statistics

- **Total try blocks**: 33
- **Total catch blocks**: 32
- **Empty catch blocks**: 0
- **Catch blocks with console statements**: 0
- **Catch blocks that swallow errors silently**: 1 (config loading - potentially intentional)

## Recommendations

1. **Review config loading behavior**: Decide if silent failure is desired or if config files should be required
2. **Consider error boundaries**: React error boundaries are already implemented (`ErrorBoundary.tsx`)
3. **Continue current patterns**: The error handling patterns are solid - maintain them

## Conclusion

The codebase demonstrates **good error handling practices**. The only potentially questionable pattern is the config loading silent failure, which may be intentional for graceful degradation. All other error handling follows best practices: proper logging, error propagation, and user feedback.

## Tradeoffs Analysis

See [ERROR_HANDLING_TRADEOFFS.md](./ERROR_HANDLING_TRADEOFFS.md) for a detailed analysis of the tradeoffs inherent in each error handling choice, including:

- Config loading: Silent failure vs strict requirements
- Service layer: Re-throwing vs returning error states
- Safe utilities: Defaults vs throwing
- Component errors: Catching vs letting bubble
- LLM retries: Retry logic vs immediate failure

