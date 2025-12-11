# Server Management

**Last Updated**: 2025-12-11

The server is managed using PM2, a production process manager for Node.js applications.

## Quick Start

### First Time Setup

1. **Build and start the server:**
   ```bash
   npm run server:start
   ```

2. **Set up auto-start on boot (run once):**
   ```bash
   ./scripts/setup-pm2-startup.sh
   ```
   This will configure PM2 to automatically start the server when your system boots.

### Daily Use

- **Check server status:**
  ```bash
  npm run server:status
  ```

- **View server logs:**
  ```bash
  npm run server:logs
  ```

- **Restart the server:**
  ```bash
  npm run server:restart
  ```

- **Stop the server:**
  ```bash
  npm run server:stop
  ```

- **Stop and remove from PM2:**
  ```bash
  npm run server:delete
  ```

## Server Details

- **Port**: 3051 (as per your preference)
- **URL**: http://localhost:3051
- **Process Name**: `writing-assistant`
- **Auto-restart**: Enabled (server will restart if it crashes)
- **Logs**: Stored in `logs/pm2-*.log`

## PM2 Commands

You can also use PM2 commands directly:

```bash
# View all PM2 processes
pm2 list

# View detailed info
pm2 show writing-assistant

# Monitor in real-time
pm2 monit

# View logs with tail
pm2 logs writing-assistant --lines 50

# Restart
pm2 restart writing-assistant

# Stop
pm2 stop writing-assistant

# Delete
pm2 delete writing-assistant
```

## Updating the Server

When you make changes to the code:

1. **Stop the server:**
   ```bash
   npm run server:stop
   ```

2. **Rebuild and restart:**
   ```bash
   npm run server:start
   ```

Or simply:
```bash
npm run server:restart
```
(Note: This restarts without rebuilding. For code changes, you need to rebuild first.)

## Troubleshooting

### Server won't start
- Check if port 3051 is already in use: `lsof -i :3051`
- Check PM2 logs: `npm run server:logs`
- Check application logs in `logs/` directory

### Server keeps crashing
- Check logs: `npm run server:logs`
- Check error logs: `tail -f logs/pm2-error.log`
- Verify environment variables in `.env` file

### Remove PM2 startup (if needed)
```bash
pm2 unstartup
```

## Development vs Production

- **Development**: Use `npm run dev` for development with hot reload
- **Production**: Use `npm run server:start` for production with PM2

The PM2 configuration uses `npm start` which runs the production build.

