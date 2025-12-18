# Server Requirements

**Last Updated**: 2025-12-15

## Core Requirements

### 1. Server Must Always Be Running
- ✅ The server must be up whenever the computer is up
- ✅ The server should automatically start when the system boots
- ✅ The server should automatically restart if it crashes

### 2. Auto-Restart on Code Changes
- ✅ The server must automatically restart whenever code changes are detected
- ✅ File watching is enabled to detect changes in source files
- ✅ Changes to configuration files, database migrations, and code should trigger a restart

### 3. Persistent Operation
- ✅ The server should run as a background service (using PM2)
- ✅ The server should survive terminal sessions closing
- ✅ The server should survive system reboots (with auto-start configured)

## Implementation

### Current Setup
- **Process Manager**: PM2
- **Configuration**: `ecosystem.config.cjs`
- **Watch Mode**: Enabled (`watch: true`)
- **Auto-restart**: Enabled (`autorestart: true`)
- **Auto-start on boot**: Configured via PM2 startup script

### Setup Commands

**First Time Setup:**
```bash
# Start the server with PM2
npm run server:start

# Configure auto-start on system boot (run once)
./scripts/setup-pm2-startup.sh
```

**Daily Use:**
- The server will automatically:
  - Start when the computer boots
  - Restart when code changes are detected
  - Restart if it crashes
  - Continue running in the background

**Manual Commands (if needed):**
```bash
# Check status
npm run server:status

# View logs
npm run server:logs

# Restart manually
npm run server:restart

# Stop (server will auto-start on next boot)
npm run server:stop
```

## Verification

To verify the server is running:
```bash
# Check PM2 status
pm2 list

# Check if server responds
curl http://localhost:3051/api/admin/db-stats

# Check port
lsof -i :3051
```

## Excluded from Watch

The following are excluded from file watching (to prevent unnecessary restarts):
- `node_modules/`
- `.next/` (build output)
- `logs/`
- `coverage/`
- `.git/`
- `*.log` files
- `*.md` files (documentation)
- `prisma/migrations/` (database migrations)

## Notes

- The server runs in development mode (`npm run dev`) to enable Next.js hot reload
- PM2 manages the process lifecycle and ensures it stays running
- Logs are stored in `logs/pm2-*.log`
- The server runs on port 3051
