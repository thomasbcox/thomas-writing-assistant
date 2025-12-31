# Development vs Production Data Separation

**Last Updated**: December 30, 2025

## Overview

The app uses **separate database files** for development and production to ensure your production data is never at risk during testing. The database selection is controlled by the `NODE_ENV` environment variable.

---

## How It Works

### Database File Selection

The app automatically selects the database file based on `NODE_ENV`:

- **Development Mode** (`NODE_ENV=development` or unset): Uses `dev.db`
- **Production Mode** (`NODE_ENV=production`): Uses `prod.db`

### Database Storage Locations

#### Electron App (Main Process)
- **Location**: Electron's user data directory (platform-specific)
  - **macOS**: `~/Library/Application Support/thomas-writing-assistant/`
  - **Windows**: `%APPDATA%/thomas-writing-assistant/`
  - **Linux**: `~/.config/thomas-writing-assistant/`
- **Files**: 
  - Development: `dev.db` in user data directory
  - Production: `prod.db` in user data directory

#### Server/Test Environment
- **Location**: Project root directory (`/Users/thomasbcox/Projects/thomas-writing-assistant/`)
- **Files**:
  - Development: `./dev.db`
  - Production: `./prod.db`

---

## Safe Testing Workflow

### Option 1: Use Development Mode (Recommended)

**For Testing New Features:**

1. **Ensure you're in development mode:**
   ```bash
   # Check current NODE_ENV
   echo $NODE_ENV
   
   # If it's set to "production", unset it or set to development
   export NODE_ENV=development
   # OR
   unset NODE_ENV
   ```

2. **Start the app:**
   ```bash
   npm run dev
   ```

3. **Verify which database is being used:**
   - Check the console output when the app starts
   - Look for: `📊 Database initialized: [path]`
   - Should show `dev.db` path

**Result**: All changes go to `dev.db`, production data in `prod.db` is untouched.

---

### Option 2: Explicit Environment Variable

**For Maximum Safety:**

1. **Explicitly set development mode:**
   ```bash
   NODE_ENV=development npm run dev
   ```

2. **Or create a `.env` file** (if not already present):
   ```bash
   # .env
   NODE_ENV=development
   ```

---

### Option 3: Backup Production Before Testing

**Before any testing session:**

1. **Backup your production database:**
   ```bash
   # Find your production database location
   # macOS example:
   cp ~/Library/Application\ Support/thomas-writing-assistant/prod.db \
      ~/Library/Application\ Support/thomas-writing-assistant/prod.db.backup.$(date +%Y%m%d_%H%M%S)
   ```

2. **Or use the project root database:**
   ```bash
   cp ./prod.db ./prod.db.backup.$(date +%Y%m%d_%H%M%S)
   ```

3. **Test in development mode** (see Option 1)

4. **Restore if needed:**
   ```bash
   cp ./prod.db.backup.YYYYMMDD_HHMMSS ./prod.db
   ```

---

## Switching Between Dev and Production

### Method 1: Environment Variable (Temporary)

**For current session only:**
```bash
# Development mode
NODE_ENV=development npm run dev

# Production mode
NODE_ENV=production npm run dev
```

### Method 2: .env File (Persistent)

**Create or edit `.env` file in project root:**
```bash
# For development
NODE_ENV=development

# For production
NODE_ENV=production
```

### Method 3: Package.json Scripts

**Add custom scripts** (if needed):
```json
{
  "scripts": {
    "dev": "NODE_ENV=development vite",
    "dev:prod": "NODE_ENV=production vite",
    "start:dev": "NODE_ENV=development electron .",
    "start:prod": "NODE_ENV=production electron ."
  }
}
```

---

## Verifying Which Database Is Active

### Check Console Output

When the app starts, look for this log message:
```
📊 Database initialized: [path/to/database.db]
```

- If it shows `dev.db` → Development mode (safe for testing)
- If it shows `prod.db` → Production mode (your real data)

### Check Database Location

**macOS:**
```bash
# Development database
ls -lh ~/Library/Application\ Support/thomas-writing-assistant/dev.db

# Production database
ls -lh ~/Library/Application\ Support/thomas-writing-assistant/prod.db
```

**Project Root:**
```bash
# Development database
ls -lh ./dev.db

# Production database
ls -lh ./prod.db
```

---

## Database Backup and Restore

### Manual Backup

**Before making changes:**

1. **Find your database location** (see "Database Storage Locations" above)

2. **Create a backup:**
   ```bash
   # macOS Electron app location
   cp ~/Library/Application\ Support/thomas-writing-assistant/prod.db \
      ~/Library/Application\ Support/thomas-writing-assistant/prod.db.backup.$(date +%Y%m%d_%H%M%S)
   
   # OR project root
   cp ./prod.db ./prod.db.backup.$(date +%Y%m%d_%H%M%S)
   ```

### Restore from Backup

```bash
# Stop the app first!
# Then restore:
cp ./prod.db.backup.YYYYMMDD_HHMMSS ./prod.db
```

### SQLite Backup (More Reliable)

**Using SQLite's backup command:**
```bash
# Backup
sqlite3 prod.db ".backup prod.db.backup.$(date +%Y%m%d_%H%M%S)"

# Restore
sqlite3 prod.db.restored ".backup prod.db.backup.YYYYMMDD_HHMMSS"
```

---

## Best Practices

### ✅ DO:

1. **Always test in development mode** (`NODE_ENV=development`)
2. **Backup production database** before major testing sessions
3. **Verify database path** in console output before making changes
4. **Use separate databases** - never mix dev and prod data
5. **Check NODE_ENV** before starting the app

### ❌ DON'T:

1. **Don't test with `NODE_ENV=production`** unless you're ready to modify production data
2. **Don't delete `prod.db`** without a backup
3. **Don't assume** - always verify which database is active
4. **Don't share** production database files

---

## Troubleshooting

### "I accidentally used production mode"

1. **Stop the app immediately**
2. **Check if you have a backup** (see backup locations above)
3. **Restore from backup** if available
4. **Check database file modification time** to see what changed:
   ```bash
   ls -lh ~/Library/Application\ Support/thomas-writing-assistant/prod.db
   ```

### "I can't find my database file"

**Check Electron's user data directory:**
```bash
# macOS
ls -la ~/Library/Application\ Support/thomas-writing-assistant/

# Windows
# Check: %APPDATA%/thomas-writing-assistant/

# Linux
ls -la ~/.config/thomas-writing-assistant/
```

### "Database seems empty after switching modes"

**This is expected!** Development and production databases are separate:
- `dev.db` starts empty (for testing)
- `prod.db` contains your production data
- Switching modes switches which database file is used

---

## Quick Reference

| Mode | NODE_ENV | Database File | Use Case |
|------|----------|---------------|----------|
| Development | `development` or unset | `dev.db` | Testing, development |
| Production | `production` | `prod.db` | Real work, production use |

---

## Current Status

**Your Current Setup:**
- **Development database**: 
  - Electron app: `~/Library/Application Support/thomas-writing-assistant/dev.db` (140KB)
  - Project root: `./dev.db` (6.4MB - used by tests/server)
- **Production database**: 
  - Project root: `./prod.db` (272KB - your real data)
  - Electron app: No `prod.db` yet (will be created when you run in production mode)
- **Separation**: ✅ Automatic based on `NODE_ENV`
- **Current NODE_ENV**: Not set (defaults to development - safe for testing)

**To Test Safely:**
1. ✅ **You're already safe!** `NODE_ENV` is not set, so it defaults to development
2. Run `npm run dev` (the script explicitly sets `NODE_ENV=development`)
3. Verify console shows `dev.db` path when app starts
4. Test freely - production data in `prod.db` is protected

**Important Notes:**
- The `npm run dev` script **always** sets `NODE_ENV=development`, so you're safe
- The Electron app stores databases in a different location than the project root
- Project root databases (`./dev.db`, `./prod.db`) are used by tests and server-side code
- Electron app databases are in the user data directory (platform-specific)

---

## Backup Scripts

The project includes backup scripts, but they currently only work with project root databases:

```bash
# Backup dev.db from project root
npm run db:backup

# Restore dev.db from project root
npm run db:restore [backup-file]
```

**To backup Electron app databases**, use manual commands (see "Database Backup and Restore" section above).

---

*For questions or issues, check the console output for database initialization messages.*

