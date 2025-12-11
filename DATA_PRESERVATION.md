# Data Preservation Guide

**Last Updated**: 2025-12-11

## Current Status

✅ **Your data is safe!** The database file (`dev.db`) is:
- **Stored locally** on your machine
- **Not committed to git** (in `.gitignore`)
- **Persistent** across code changes and refactoring
- **132KB** in size (contains your concepts and capsules)

## Database Location

- **File**: `./dev.db` (in project root)
- **Type**: SQLite (single file database)
- **Backup**: Not automatically backed up (see below)

## Data Preservation Strategy

### ✅ What's Preserved

1. **All Concepts** - Stored in `Concept` table
2. **All Links** - Stored in `Link` table
3. **All Capsules** - Stored in `Capsule` table
4. **All Anchors** - Stored in `Anchor` table
5. **Repurposed Content** - Stored in `RepurposedContent` table
6. **Link Names** - Stored in `LinkName` table

### ⚠️ What's NOT Preserved

- **Test databases** (`test.db`) - Recreated for each test run
- **In-memory databases** - Used only in tests

## Backup Strategy

### Manual Backup

**Before major refactoring or updates:**

```bash
# Create a backup
./scripts/backup-db.sh

# Or with a custom name
./scripts/backup-db.sh before-refactor-2024-12-03
```

**Restore from backup:**

```bash
# List available backups
./scripts/restore-db.sh

# Restore specific backup
./scripts/restore-db.sh backup_20241203_120000.db
```

### Automatic Backup (Recommended)

Add to your workflow before major changes:

```bash
# Before refactoring
npm run db:backup

# After refactoring (if something goes wrong)
npm run db:restore
```

## Migration Safety

### Prisma Migrations

Prisma migrations are **non-destructive** by default:
- ✅ **Additive changes** (new tables, columns) - Safe
- ✅ **Data transformations** - Preserved
- ⚠️ **Column removals** - Data in those columns is lost
- ⚠️ **Table deletions** - All data in table is lost

### Safe Migration Practices

1. **Always backup before migrations:**
   ```bash
   ./scripts/backup-db.sh before-migration
   npm run db:migrate
   ```

2. **Review migration files** in `prisma/migrations/` before applying

3. **Test migrations** on a copy first:
   ```bash
   cp dev.db dev.db.test
   # Test migration on copy
   ```

## Refactoring Safety

### ✅ Safe Refactoring

These changes **won't affect your data**:
- Code refactoring (services, components, routers)
- UI changes
- Adding new features
- Updating dependencies
- Changing API endpoints
- Switching LLM providers

### ⚠️ Potentially Risky Changes

These changes **might affect your data**:
- **Schema changes** (modifying `schema.prisma`)
  - Always backup first
  - Review migration SQL
  - Test on copy
  
- **Database provider changes** (SQLite → PostgreSQL)
  - Requires data migration
  - Use Prisma's migration tools

- **Deleting migration files**
  - Can cause sync issues
  - Don't delete unless you know what you're doing

## Current Data Status

Based on your database:
- **Concepts**: 0 active concepts (database exists but empty)
- **Capsules**: 0 capsules
- **Database size**: 132KB (mostly schema/metadata)

## Best Practices

### 1. Regular Backups

```bash
# Weekly backup
./scripts/backup-db.sh weekly_$(date +%Y%m%d)
```

### 2. Before Major Changes

```bash
# Before schema changes
./scripts/backup-db.sh pre-schema-change

# Before refactoring
./scripts/backup-db.sh pre-refactor
```

### 3. Version Control

- ✅ **Don't commit** `dev.db` (already in `.gitignore`)
- ✅ **Do commit** migration files
- ✅ **Do commit** schema changes
- ✅ **Consider committing** backup scripts

### 4. Recovery Plan

If data is lost:

1. **Check backups:**
   ```bash
   ls -lh backups/
   ```

2. **Restore from backup:**
   ```bash
   ./scripts/restore-db.sh [backup-file]
   ```

3. **If no backup exists:**
   - Check Time Machine (macOS)
   - Check cloud sync (if dev.db is synced)
   - Check git history (if accidentally committed)

## Adding Backup to package.json

Add these scripts for convenience:

```json
{
  "scripts": {
    "db:backup": "bash scripts/backup-db.sh",
    "db:restore": "bash scripts/restore-db.sh"
  }
}
```

## Monitoring

Check your data anytime:

```bash
# Count concepts
sqlite3 dev.db "SELECT COUNT(*) FROM Concept WHERE status='active';"

# Count capsules
sqlite3 dev.db "SELECT COUNT(*) FROM Capsule;"

# List all tables
sqlite3 dev.db ".tables"

# Database size
ls -lh dev.db
```

## Summary

✅ **Your data is preserved** across:
- Code refactoring
- Dependency updates
- UI changes
- Feature additions
- Provider switches (OpenAI ↔ Gemini)

⚠️ **Backup before**:
- Schema changes
- Major migrations
- Database provider changes

The database file (`dev.db`) is your single source of truth and persists across all development cycles.

