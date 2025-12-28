# Build Integration Tests

## Purpose

These tests verify that the compiled Electron code can be loaded and executed correctly. They catch module resolution issues that would only appear at runtime, preventing broken builds from reaching production.

## What They Test

### Import Path Verification
- ✅ `../src/` imports are transformed to `./src/`
- ✅ Path aliases (`~/`) are converted to relative paths
- ✅ All relative imports have `.js` extensions (required for ESM)

### Module Loading
- ✅ Compiled modules can be imported without resolution errors
- ✅ No broken import paths in the compiled output

### Build Script Integration
- ✅ `fix-electron-imports.mjs` script runs successfully
- ✅ Import paths are correctly transformed by the build script

## Running

```bash
# First, build the Electron code
npm run build:electron

# Then run the build tests
npm run test:build
```

## Issues These Tests Would Have Caught

### Before Fix
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/.../src/server/schema' 
imported from /Users/.../dist-electron/main.js
```

This would have been caught by:
- `main.js should not have ../src/ imports`
- `should be able to import main.js without module resolution errors`

### Path Alias Issues
```
Cannot find package '~' imported from /Users/.../src/server/services/llm/client.js
```

This would have been caught by:
- `src files should not have ~/ path alias imports`

## Test Files

- `electron-build.test.ts` - Tests for compiled Electron code
- `build-script.test.ts` - Tests for build process and scripts

## Adding New Tests

When adding new Electron code, ensure:
1. Imports use relative paths that will work at runtime
2. Run `npm run build:electron` to compile
3. Run `npm run test:build` to verify
4. Fix any issues caught by the tests

