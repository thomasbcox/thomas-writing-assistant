#!/bin/bash

# Script to ensure PM2 is running and server is started
# Run this if pm2 list is empty

set -e

echo "Checking PM2 status..."

# Check if PM2 daemon is running
if ! pm2 ping > /dev/null 2>&1; then
  echo "PM2 daemon not running, starting..."
  pm2 list > /dev/null 2>&1 || true  # This will start the daemon
fi

# Check if server is running
if ! pm2 list | grep -q "writing-assistant"; then
  echo "Server not running, starting..."
  cd /Users/thomasbcox/Projects/thomas-writing-assistant
  pm2 start ecosystem.config.cjs
  pm2 save --force
  echo "✅ Server started and saved"
else
  echo "✅ Server is already running"
fi

# Show status
pm2 list
