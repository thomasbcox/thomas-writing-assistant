# Error Handling Tradeoffs Analysis

**Last Updated**: 2025-12-11

This document analyzes the tradeoffs inherent in the error handling choices made throughout the codebase.

## 1. Config Loading: Silent Failure vs Strict Requirements

### Current Approach: Silent Failure with Empty Configs

```typescript
try {
  const content = fs.readFileSync(styleGuidePath, "utf-8");
  this.styleGuide = (yaml.load(content) as StyleGuide) ?? {};
} catch (error) {
  logger.warn({ err: error, configFile: "style_guide.yaml" }, "Failed to load config file");
  // Continues with empty config
}
```

### Tradeoffs

#### ✅ Advantages of Silent Failure
1. **Graceful Degradation**: App can start even if config files are missing or corrupted
   - Useful for development environments
   - Allows partial functionality (e.g., concepts work without style guide)
   - Reduces deployment friction

2. **User Experience**: Users can still use the app and add configs later via UI
   - No hard failure blocking access
   - Config can be created through the Writing Config tab

3. **Development Velocity**: Developers can start working without full setup
   - Faster onboarding
   - Less configuration burden

#### ❌ Disadvantages of Silent Failure
1. **Silent Failures**: Empty configs mean LLM won't use style/credo/constraints
   - Content generation may not match user's voice
   - No clear indication that configs are missing
   - User might not realize why content quality is poor

2. **Debugging Difficulty**: Hard to diagnose why content doesn't match expectations
   - No obvious error message
   - Must check logs to see warnings
   - User might not know to check config files

3. **Data Integrity Risk**: App appears to work but produces suboptimal results
   - False sense of functionality
   - Generated content may not meet requirements

### Alternative: Strict Requirements (Throw on Failure)

```typescript
try {
  const content = fs.readFileSync(styleGuidePath, "utf-8");
  this.styleGuide = (yaml.load(content) as StyleGuide) ?? {};
  if (Object.keys(this.styleGuide).length === 0) {
    throw new Error("style_guide.yaml is empty or invalid");
  }
} catch (error) {
  logger.error({ err: error, configFile: "style_guide.yaml" }, "Failed to load required config file");
  throw new Error(`Cannot start: ${error instanceof Error ? error.message : "Unknown error"}`);
}
```

#### ✅ Advantages of Strict Requirements
1. **Fail Fast**: Problems are immediately obvious
   - Clear error messages
   - Forces proper configuration
   - Prevents silent degradation

2. **Data Quality**: Ensures all content generation uses proper configs
   - Guaranteed voice/style consistency
   - No surprises about missing configs

3. **Explicit Dependencies**: Makes requirements clear
   - Documentation is self-enforcing
   - Setup process is unambiguous

#### ❌ Disadvantages of Strict Requirements
1. **Rigidity**: App won't start without all configs
   - Higher barrier to entry
   - More setup required
   - Less forgiving for experimentation

2. **Deployment Complexity**: Production deployments must ensure configs exist
   - More moving parts
   - Potential for deployment failures
   - Requires config management strategy

3. **Development Friction**: Slower iteration cycles
   - Must create configs before testing
   - Can't quickly prototype features

### Recommendation

**Hybrid Approach**: Make configs optional but provide clear feedback when missing

```typescript
try {
  const content = fs.readFileSync(styleGuidePath, "utf-8");
  this.styleGuide = (yaml.load(content) as StyleGuide) ?? {};
  if (Object.keys(this.styleGuide).length === 0) {
    logger.warn({ configFile: "style_guide.yaml" }, "Config file is empty - using defaults");
    this.styleGuide = getDefaultStyleGuide();
  }
} catch (error) {
  logger.warn({ err: error, configFile: "style_guide.yaml" }, "Failed to load config file - using defaults");
  this.styleGuide = getDefaultStyleGuide();
}
```

**Tradeoff**: Provides defaults while making it clear when configs are missing, but requires maintaining default configs.

---

## 2. Service Layer: Re-throwing vs Returning Error States

### Current Approach: Log and Re-throw

```typescript
try {
  const response = await client.completeJSON(prompt, systemPrompt);
  return repurposed;
} catch (error) {
  logger.error({ service: "repurposer", error }, "Content repurposing failed");
  logServiceError(error, "repurposer", { context });
  throw new Error(`Failed to repurpose content: ${errorMessage}`);
}
```

### Tradeoffs

#### ✅ Advantages of Re-throwing
1. **Explicit Error Propagation**: Caller must handle the error
   - Forces proper error handling
   - Clear error boundaries
   - Type-safe error handling

2. **Stack Trace Preservation**: Original error context maintained
   - Better debugging
   - Full error chain visible
   - Easier to trace issues

3. **Consistent API**: All services follow same pattern
   - Predictable behavior
   - Easier to reason about
   - Standard error handling

#### ❌ Disadvantages of Re-throwing
1. **Coupling**: Caller must know about all possible errors
   - More error handling code
   - Potential for unhandled errors
   - Requires try/catch at every call site

2. **Error Handling Overhead**: Every service call needs error handling
   - More boilerplate
   - Potential for inconsistent handling
   - Can lead to error swallowing

### Alternative: Result Type Pattern

```typescript
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

async function repurposeAnchorContent(...): Promise<Result<RepurposedContent[], Error>> {
  try {
    const response = await client.completeJSON(prompt, systemPrompt);
    return { success: true, data: repurposed };
  } catch (error) {
    logger.error({ service: "repurposer", error }, "Content repurposing failed");
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
```

#### ✅ Advantages of Result Type
1. **Type Safety**: Errors are part of the type system
   - Compiler forces error handling
   - No unhandled errors
   - Explicit error types

2. **No Exceptions**: Functional programming style
   - Predictable control flow
   - Easier to reason about
   - No try/catch needed

#### ❌ Disadvantages of Result Type
1. **Boilerplate**: More verbose code
   - Every call needs pattern matching
   - More code to write
   - TypeScript doesn't have native Result type

2. **Adoption Cost**: Different from standard JavaScript patterns
   - Team learning curve
   - Inconsistent with ecosystem
   - Requires custom utilities

### Recommendation

**Current approach (re-throw) is appropriate** for this codebase:
- Standard JavaScript/TypeScript pattern
- Works well with tRPC error handling
- Clear error propagation
- Good logging before re-throw

---

## 3. Safe Utilities: Defaults vs Throwing

### Current Approach: Return Defaults

```typescript
export function safeJsonParseArray<T>(json: string | null | undefined, defaultValue: T[] = []): T[] {
  if (!json) return defaultValue;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    logger.warn({ json: json.slice(0, 200) }, "JSON parsed but is not an array");
    return defaultValue;
  } catch (error) {
    logger.error({ error, json: json.slice(0, 200) }, "Failed to parse JSON array");
    return defaultValue;
  }
}
```

### Tradeoffs

#### ✅ Advantages of Returning Defaults
1. **Resilience**: App continues even with bad data
   - Prevents crashes from malformed JSON
   - Graceful handling of edge cases
   - Better user experience

2. **Appropriate for Utilities**: Utility functions should be forgiving
   - Caller can decide if error is critical
   - Reusable across contexts
   - Matches common utility patterns

3. **Logging**: Errors are logged even when returning defaults
   - Visibility into data quality issues
   - Can monitor for patterns
   - Debugging information preserved

#### ❌ Disadvantages of Returning Defaults
1. **Silent Data Loss**: Bad data becomes empty/default
   - May hide real problems
   - User might not notice
   - Data corruption can go undetected

2. **Ambiguity**: Can't distinguish between "no data" and "bad data"
   - Same return value for different scenarios
   - Caller can't react differently
   - May lead to incorrect behavior

### Alternative: Throw on Invalid Data

```typescript
export function parseJsonArray<T>(json: string): T[] {
  if (!json) throw new Error("JSON string is required");
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error("JSON is not an array");
    }
    return parsed as T[];
  } catch (error) {
    throw new Error(`Failed to parse JSON array: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

#### ✅ Advantages of Throwing
1. **Explicit Failures**: Caller knows when data is invalid
   - Can handle appropriately
   - No silent data loss
   - Clear error messages

2. **Data Integrity**: Forces validation
   - Bad data is caught early
   - Prevents corruption
   - Maintains data quality

#### ❌ Disadvantages of Throwing
1. **Less Resilient**: App may crash on bad data
   - Requires try/catch everywhere
   - More error handling code
   - Potential for unhandled errors

2. **Less Flexible**: Can't use in contexts where defaults are desired
   - Need separate functions
   - More API surface
   - Less reusable

### Recommendation

**Current approach (safe utilities with defaults) is appropriate**:
- Utility functions should be forgiving
- Logging provides visibility
- Caller can validate if needed
- Matches common patterns (e.g., `parseInt()` returns `NaN`)

**Consider**: Adding a strict variant for cases where validation is required:

```typescript
// Safe version (current)
safeJsonParseArray<T>(json, defaultValue): T[]

// Strict version (new)
parseJsonArrayStrict<T>(json): T[] // throws on error
```

---

## 4. Component Error Handling: Catch vs Let Bubble

### Current Approach: Catch and Update State

```typescript
try {
  const newCapsule = await new Promise<string>((resolve, reject) => {
    createCapsuleMutation.mutate(..., {
      onSuccess: (capsule) => resolve(capsule.id),
      onError: (error) => reject(error),
    });
  });
  capsuleId = newCapsule;
} catch (error) {
  setPdfProcessingStatus({ stage: "error" });
  onError?.(`Error creating capsule: ${error instanceof Error ? error.message : "Unknown error"}`);
  return;
}
```

### Tradeoffs

#### ✅ Advantages of Catching in Components
1. **User Feedback**: Errors are shown to users
   - Toast notifications
   - Error states in UI
   - Clear error messages

2. **State Management**: Component state reflects errors
   - Loading states cleared
   - Error states set
   - UI remains responsive

3. **Isolation**: Errors don't crash entire app
   - Error boundaries catch unexpected errors
   - Component-level error handling for expected errors
   - Better user experience

#### ❌ Disadvantages of Catching in Components
1. **Error Handling Duplication**: Similar code in many components
   - Boilerplate in each component
   - Potential for inconsistency
   - More code to maintain

2. **Hidden Errors**: Some errors might not be logged
   - If `onError` callback fails
   - If state update fails
   - Potential for silent failures

### Alternative: Let Errors Bubble to Error Boundary

```typescript
// No try/catch - let error boundary handle it
const newCapsule = await createCapsuleMutation.mutateAsync(...);
```

#### ✅ Advantages of Bubbling
1. **Centralized Handling**: Error boundary handles all errors
   - Consistent error UI
   - Less boilerplate
   - Single place for error handling

2. **Error Logging**: Error boundary can log all errors
   - Centralized logging
   - Better error tracking
   - Consistent error reporting

#### ❌ Disadvantages of Bubbling
1. **Less Granular**: Can't handle errors at component level
   - All errors show same UI
   - Can't provide context-specific messages
   - Less user-friendly

2. **State Management**: Component state may be inconsistent
   - Loading states might not clear
   - Partial state updates
   - Potential for UI bugs

### Recommendation

**Current approach (catch in components) is appropriate**:
- Provides better UX with specific error messages
- Allows component-level error recovery
- Error boundaries catch unexpected errors
- Matches React best practices

**Consider**: Creating a reusable error handling hook to reduce boilerplate:

```typescript
function useErrorHandler() {
  const addToast = useToast();
  return (error: Error, context: string) => {
    logger.error({ error, context }, "Component error");
    addToast(`Error: ${error.message}`, "error");
  };
}
```

---

## 5. LLM Provider: Retry Logic vs Immediate Failure

### Current Approach: Retry with Model Fallbacks

```typescript
const fallbackModels = ["gemini-3-pro-preview", "gemini-1.5-flash", ...];
for (const modelName of modelsToTry) {
  try {
    const result = await model.generateContent(fullPrompt);
    return result;
  } catch (error) {
    if (errorMessage.includes("404")) {
      logger.warn({ model: modelName }, "Model not available, trying next");
      continue; // Try next model
    }
    throw error; // Re-throw non-404 errors
  }
}
```

### Tradeoffs

#### ✅ Advantages of Retry Logic
1. **Resilience**: App works even if preferred model unavailable
   - Automatic fallback
   - Better uptime
   - User doesn't see errors

2. **Model Availability**: Handles API changes gracefully
   - Models may be deprecated
   - New models may be added
   - API version changes

3. **User Experience**: Seamless operation
   - No user intervention needed
   - Transparent fallback
   - Consistent functionality

#### ❌ Disadvantages of Retry Logic
1. **Performance**: Multiple attempts take time
   - Slower when fallback needed
   - Multiple API calls
   - Potential for timeout

2. **Cost**: May use more expensive models
   - Fallback might be pricier
   - Multiple API calls cost more
   - No control over which model used

3. **Debugging**: Harder to diagnose issues
   - Which model actually worked?
   - Why did preferred model fail?
   - Logs show multiple attempts

4. **Unpredictability**: Can't guarantee which model is used
   - Results may vary
   - Cost may vary
   - Performance may vary

### Alternative: Fail Fast with Clear Error

```typescript
try {
  const result = await model.generateContent(fullPrompt);
  return result;
} catch (error) {
  if (errorMessage.includes("404")) {
    throw new Error(`Model ${this.model} is not available. Please update your model selection.`);
  }
  throw error;
}
```

#### ✅ Advantages of Fail Fast
1. **Predictability**: Always uses specified model
   - Consistent results
   - Predictable costs
   - Clear expectations

2. **Performance**: No retry overhead
   - Faster failure
   - Single API call
   - Immediate feedback

3. **Debugging**: Clear error messages
   - Know exactly what failed
   - Easier to diagnose
   - Better error visibility

#### ❌ Disadvantages of Fail Fast
1. **Brittleness**: App fails if model unavailable
   - Poor user experience
   - Requires manual intervention
   - More support burden

2. **Maintenance**: Must update code for model changes
   - More code changes
   - Slower to adapt
   - More deployment cycles

### Recommendation

**Current approach (retry with fallbacks) is appropriate** for production:
- Provides best user experience
- Handles API changes gracefully
- Logs each attempt for debugging
- Only retries on 404 (model not found), not on other errors

**Consider**: Adding configuration to control retry behavior:
- Environment variable to disable retries
- Admin setting to choose retry strategy
- Metrics to track which models are used

---

## Summary of Tradeoffs

| Pattern | Current Choice | Primary Tradeoff |
|---------|---------------|-----------------|
| **Config Loading** | Silent failure | Resilience vs Data Quality |
| **Service Errors** | Log and re-throw | Explicit errors vs Boilerplate |
| **Safe Utilities** | Return defaults | Resilience vs Data Integrity |
| **Component Errors** | Catch and update state | UX vs Code duplication |
| **LLM Retries** | Retry with fallbacks | Resilience vs Predictability |

## General Principles

1. **Fail Fast for Critical Paths**: Configs might be critical, but current approach allows graceful degradation
2. **Fail Safe for Utilities**: Safe parsing functions should be forgiving
3. **User-Facing Errors**: Components should catch and display errors
4. **Service Errors**: Log thoroughly, then propagate
5. **External APIs**: Retry for transient failures, fail fast for permanent ones

## Recommendations

1. **Config Loading**: Consider hybrid approach with defaults and clear warnings
2. **Service Layer**: Current approach is good - maintain it
3. **Safe Utilities**: Current approach is good - consider adding strict variants
4. **Component Errors**: Current approach is good - consider reusable hooks
5. **LLM Retries**: Current approach is good - consider configuration options

