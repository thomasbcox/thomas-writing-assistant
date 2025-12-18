# PM2 Troubleshooting Guide

## Why `pm2 list` Might Be Empty

### Common Causes

1. **PM2 Daemon Not Running**
   - PM2 runs a background daemon process
   - If the daemon stops, `pm2 list` will be empty
   - **Fix**: Any PM2 command will restart the daemon automatically

2. **PM2 Process List Not Saved**
   - If processes aren't saved, they won't persist after reboot
   - **Fix**: Run `pm2 save` after starting processes

3. **Different PM2 Instance**
   - Multiple PM2 instances can exist
   - **Fix**: Check `pm2 list` - if empty, start your processes again

4. **Processes Crashed and Not Restarting**
   - If processes crash and aren't configured to restart
   - **Fix**: Check `pm2 logs` for errors

## Current Setup

**Server Name**: `writing-assistant`  
**Status**: Should be `online`  
**Watch Mode**: Enabled (auto-restart on code changes)

## Commands to Check Status

```bash
# Check if server is running
pm2 list

# If empty, start the server
cd /Users/thomasbcox/Projects/thomas-writing-assistant
pm2 start ecosystem.config.cjs

# Save the process list
pm2 save

# Check server logs if issues
pm2 logs writing-assistant

# Check server info
pm2 info writing-assistant
```

## If `pm2 list` is Empty

1. **Start the server:**
   ```bash
   cd /Users/thomasbcox/Projects/thomas-writing-assistant
   pm2 start ecosystem.config.cjs
   ```

2. **Save the process:**
   ```bash
   pm2 save
   ```

3. **Verify it's running:**
   ```bash
   pm2 list
   curl http://localhost:3051
   ```

## Auto-Start on Boot

The LaunchAgent is configured to run `pm2 resurrect` on boot, which restores saved processes.

**To verify auto-start is working:**
```bash
# Check LaunchAgent is loaded
launchctl list | grep pm2

# Check PM2 dump file exists
ls -la ~/.pm2/dump.pm2
```

## Server Requirements

- ✅ Server must always be running
- ✅ Server auto-restarts on code changes (watch mode)
- ✅ Server auto-starts on system boot (LaunchAgent configured)

See `SERVER_REQUIREMENTS.md` for complete requirements.
