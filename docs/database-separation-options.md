# Database Separation Options: Dev vs Prod

## Current State
- Single database file: `dev.db` in project root
- Used for both development and production
- Risk of accidentally overwriting production data during development

## Three Clean Approaches

### Option 1: Environment-Based Database Files (Recommended)
**Approach**: Use `NODE_ENV` to automatically select the database file.

**Pros:**
- ✅ Zero configuration overhead - works automatically
- ✅ Clear separation by environment
- ✅ No manual switching needed
- ✅ Standard practice (follows NODE_ENV convention)

**Cons:**
- ⚠️ Must set NODE_ENV correctly (but you already do this)
- ⚠️ Both files exist in same directory (can be organized better)

**Implementation:**
```typescript
// src/server/db.ts
const dbPath = env.NODE_ENV === "production" 
  ? "./prod.db" 
  : "./dev.db";
```

**File Structure:**
```
project-root/
├── dev.db          # Development database
├── prod.db         # Production database
└── .env            # DATABASE_URL can be removed or ignored
```

**Usage:**
```bash
# Development (default)
npm run dev          # Uses dev.db

# Production
NODE_ENV=production npm start    # Uses prod.db
```

---

### Option 2: Separate Database Directories
**Approach**: Organize databases in a `data/` directory with subdirectories.

**Pros:**
- ✅ Better organization and file management
- ✅ Easy to backup entire directories
- ✅ Clear visual separation
- ✅ Can add staging/test databases easily

**Cons:**
- ⚠️ Slightly more complex path handling
- ⚠️ Need to ensure directories exist

**Implementation:**
```typescript
// src/server/db.ts
const dbDir = env.NODE_ENV === "production" ? "data/prod" : "data/dev";
const dbPath = `${dbDir}/database.db`;
```

**File Structure:**
```
project-root/
├── data/
│   ├── dev/
│   │   └── database.db
│   └── prod/
│       └── database.db
└── .env
```

**Usage:**
```bash
# Development
npm run dev          # Uses data/dev/database.db

# Production
NODE_ENV=production npm start    # Uses data/prod/database.db
```

---

### Option 3: Explicit Environment Variable
**Approach**: Use a dedicated `DB_ENV` variable for explicit control.

**Pros:**
- ✅ Maximum flexibility and explicit control
- ✅ Can run dev and prod simultaneously (different processes)
- ✅ Not dependent on NODE_ENV
- ✅ Can add staging/test environments easily

**Cons:**
- ⚠️ Requires explicit configuration in .env files
- ⚠️ More manual setup

**Implementation:**
```typescript
// src/server/db.ts
const dbEnv = env.DB_ENV || "dev";  // Default to dev
const dbPath = `./${dbEnv}.db`;
```

**File Structure:**
```
project-root/
├── dev.db
├── prod.db
├── .env              # DB_ENV=dev (or omit, defaults to dev)
└── .env.production    # DB_ENV=prod (for production builds)
```

**Usage:**
```bash
# Development (.env has DB_ENV=dev or omitted)
npm run dev          # Uses dev.db

# Production (.env.production has DB_ENV=prod)
npm run build
NODE_ENV=production npm start    # Uses prod.db
```

---

## Recommendation: Option 1 (Environment-Based)

**Why:**
1. **Minimal overhead** - Works automatically with existing NODE_ENV setup
2. **Standard practice** - Follows Node.js conventions
3. **Zero configuration** - No need to remember to set variables
4. **Safe by default** - Development can't accidentally touch production

**Migration Steps:**
1. Rename current `dev.db` to keep as development database
2. Create empty `prod.db` for production
3. Update `src/server/db.ts` to use environment-based selection
4. Update `.env` to remove DATABASE_URL (or keep for backwards compatibility)
5. Update documentation

**Safety Features to Add:**
- Add a warning if NODE_ENV=production but using dev.db
- Add database file size/backup scripts per environment
- Add `.gitignore` entries for both database files

---

## Additional Safety Measures (All Options)

### 1. Database Backup Scripts
```bash
# scripts/backup-dev.sh
cp dev.db backups/dev-$(date +%Y%m%d-%H%M%S).db

# scripts/backup-prod.sh  
cp prod.db backups/prod-$(date +%Y%m%d-%H%M%S).db
```

### 2. Environment Validation
Add startup check to warn if wrong database is being used:
```typescript
if (env.NODE_ENV === "production" && dbPath.includes("dev")) {
  console.warn("⚠️  WARNING: Production mode but using dev database!");
}
```

### 3. Separate Backup Directories
```
backups/
├── dev/
│   └── dev-2025-12-20-143022.db
└── prod/
    └── prod-2025-12-20-143022.db
```

---

## Comparison Table

| Feature | Option 1 (NODE_ENV) | Option 2 (Directories) | Option 3 (DB_ENV) |
|---------|---------------------|------------------------|-------------------|
| **Setup Complexity** | ⭐ Low | ⭐⭐ Medium | ⭐⭐ Medium |
| **Configuration** | None needed | Path setup | Env var setup |
| **Flexibility** | ⭐⭐ Good | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent |
| **Organization** | ⭐⭐ Good | ⭐⭐⭐ Excellent | ⭐⭐ Good |
| **Safety** | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent |
| **Standard Practice** | ⭐⭐⭐ Yes | ⭐⭐ Good | ⭐ Good |

---

## Next Steps

1. Choose an option (recommend Option 1)
2. Implement the database path logic
3. Create production database file
4. Update backup scripts
5. Test both environments
6. Update documentation
