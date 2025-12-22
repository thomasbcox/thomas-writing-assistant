# Database Toggling Guide: DEV vs PROD

## Quick Reference

The system now **automatically** selects the database based on `NODE_ENV`:

- **Development**: Uses `dev.db` (when `NODE_ENV=development` or not set)
- **Production**: Uses `prod.db` (when `NODE_ENV=production`)

## How to Toggle

### Method 1: Automatic (Recommended)
The database is automatically selected based on `NODE_ENV`:

```bash
# Development (uses dev.db)
npm run dev
# or
NODE_ENV=development npm run dev

# Production (uses prod.db)
NODE_ENV=production npm start
# or
NODE_ENV=production npm run build && npm start
```

### Method 2: Manual Override
You can still manually set `DATABASE_URL` in your `.env` file to override the automatic selection:

```bash
# In .env file
DATABASE_URL="file:./dev.db"    # Force dev database
# or
DATABASE_URL="file:./prod.db"   # Force prod database
```

**Note**: If `DATABASE_URL` is explicitly set in `.env`, it will override the automatic selection.

## Database Files

The system expects these database files in your project root:

```
project-root/
├── dev.db          # Development database
├── prod.db         # Production database
└── .env            # Environment variables (optional DATABASE_URL)
```

## Verification

### Check Which Database is Active

1. **Look at the console output** when the server starts:
   ```
   📊 Using database: dev.db (NODE_ENV: development)
   ```

2. **Check the environment badge** in the Dashboard:
   - Green "DEV" badge = using dev database
   - Gold "PROD" badge = using prod database

3. **Check the health endpoint**:
   ```bash
   curl http://localhost:3000/api/health | jq .environment
   ```

### Check Database File Location

The database files are in your project root directory:
```bash
ls -lh *.db
```

## Safety Features

1. **Automatic Selection**: No need to remember to switch - it's automatic based on `NODE_ENV`
2. **Warning System**: If production mode tries to use dev database, you'll see a warning
3. **Console Logging**: Server startup logs which database is being used
4. **Environment Badge**: Visual indicator in the Dashboard shows current environment

## Common Scenarios

### Scenario 1: Daily Development
```bash
# Just run normally - uses dev.db automatically
npm run dev
```

### Scenario 2: Testing Production Locally
```bash
# Switch to production mode
NODE_ENV=production npm start
# Uses prod.db automatically
```

### Scenario 3: Force Specific Database
```bash
# Edit .env file
echo 'DATABASE_URL="file:./prod.db"' >> .env

# Restart server
npm run dev
# Now uses prod.db even in development mode
```

## Troubleshooting

### Problem: Wrong database is being used

**Solution**: Check your `NODE_ENV`:
```bash
echo $NODE_ENV
```

If it's set incorrectly, unset it or set it correctly:
```bash
unset NODE_ENV        # For development
export NODE_ENV=production  # For production
```

### Problem: Database file doesn't exist

**Solution**: The system will create it automatically when you first run the server. Or create it manually:
```bash
touch dev.db
touch prod.db
```

### Problem: Want to use a different database name

**Solution**: Set `DATABASE_URL` in `.env`:
```bash
DATABASE_URL="file:./my-custom-db.db"
```

## Migration from Old System

If you were previously using `DATABASE_URL` in `.env`:

1. **Option A**: Remove `DATABASE_URL` from `.env` to use automatic selection
2. **Option B**: Keep `DATABASE_URL` in `.env` to maintain manual control

Both options work - automatic selection is just more convenient!
