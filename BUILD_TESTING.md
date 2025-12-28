# Build Integration Testing

## Overview

Build integration tests verify that compiled Electron code can be loaded and executed correctly. They catch module resolution issues that would only appear at runtime, preventing broken builds from reaching production.

## What These Tests Catch

### 1. Import Path Issues
- ❌ `../src/server/schema` (incorrect relative path)
- ✅ `./src/server/schema.js` (correct relative path with .js extension)

### 2. Path Alias Resolution
- ❌ `~/server/schema` (path alias not resolved)
- ✅ `../../../server/schema.js` (converted to relative path)

### 3. Missing File Extensions
- ❌ `from "./ipc-handlers/index"` (missing .js extension in ESM)
- ✅ `from "./ipc-handlers/index.js"` (correct ESM import)

### 4. Module Loading Errors
- Verifies compiled modules can actually be imported
- Catches circular dependency issues
- Ensures all dependencies are correctly resolved

## Running Build Tests

### Prerequisites
First, build the Electron code:
```bash
npm run build:electron
```

Note: TypeScript compilation errors may appear, but the build will continue with existing compiled files due to `skipLibCheck: true`. The important part is that the files exist in `dist-electron/`.

### Run Tests
```bash
npm run test:build
```

This runs all tests in `src/test/build/`.

## Test Files

### `electron-build.test.ts`
Comprehensive tests for the compiled Electron code:

1. **Build Output Verification**
   - Ensures required files exist in `dist-electron/`
   - Verifies build artifacts are generated

2. **Import Path Verification**
   - Checks that `../src/` imports are transformed to `./src/`
   - Verifies path aliases (`~/`) are converted to relative paths
   - Ensures all relative imports have `.js` extensions

3. **Module Loading Tests**
   - Attempts to import compiled modules
   - Catches module resolution errors before runtime
   - Verifies no broken import paths

4. **Import Path Consistency**
   - Ensures all IPC handler files use consistent import patterns
   - Verifies handler-to-handler imports work correctly

### `build-script.test.ts`
Tests for the build process itself:

1. **Script Availability**
   - Verifies `fix-electron-imports.mjs` exists and is executable

2. **Import Path Transformation**
   - Tests that the fix script correctly transforms imports
   - Verifies transformations are applied consistently

3. **Build Process Integration**
   - Ensures `build:electron` script includes the fix script
   - Verifies build process completes successfully

## Integration with CI/CD

These tests should be run in your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Build Electron
  run: npm run build:electron

- name: Run Build Tests
  run: npm run test:build
```

This ensures:
- Build scripts haven't broken
- Import paths are correctly transformed
- No module resolution issues slip through

## Example Failures

### Before Fix (What These Tests Catch)

```
❌ Cannot find module '/Users/.../src/server/schema' 
   imported from /Users/.../dist-electron/main.js
```

This indicates:
- Import path uses `../src/` instead of `./src/`
- Missing `.js` extension

### After Fix (Tests Pass)

```
✅ All import paths correctly transformed
✅ All modules can be loaded
✅ No path alias imports remaining
```

## Adding New Tests

When adding new Electron code:

1. Ensure imports use relative paths that will work at runtime
2. Run `npm run build:electron` to compile
3. Run `npm run test:build` to verify
4. Fix any issues caught by the tests

## Troubleshooting

### Tests Fail: "dist-electron directory not found"
**Solution**: Run `npm run build:electron` first

### Tests Fail: "Cannot find module"
**Solution**: 
1. Check that the fix script ran: `node scripts/fix-electron-imports.mjs`
2. Verify import paths in the compiled files
3. Check that all files have `.js` extensions on relative imports

### Tests Fail: "Path alias (~/) not transformed"
**Solution**: 
1. Verify `fix-electron-imports.mjs` is running
2. Check that the script is included in `build:electron`
3. Manually run the fix script to see errors

## Related Files

- `scripts/fix-electron-imports.mjs` - Post-build script that fixes import paths
- `electron/tsconfig.json` - TypeScript config for Electron compilation
- `package.json` - Build scripts and test commands

