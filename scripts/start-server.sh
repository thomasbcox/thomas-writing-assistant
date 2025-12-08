#!/bin/bash

# Start the writing assistant server with PM2
# This script builds the app and starts it with PM2

set -e

echo "Building the application..."
npm run build

echo "Starting server with PM2..."
pm2 start ecosystem.config.js

echo "Server started! Use 'npm run server:status' to check status"
echo "Use 'npm run server:logs' to view logs"
echo "Use 'npm run server:stop' to stop the server"

