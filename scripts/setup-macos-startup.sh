#!/bin/bash

# Set up PM2 to start on macOS system boot using launchctl bootstrap
# This is the recommended approach for macOS

set -e

echo "Setting up PM2 auto-start for macOS..."
echo ""

# Get the PM2 startup command
STARTUP_CMD=$(pm2 startup launchd -u $USER --hp $HOME 2>&1 | grep "sudo env" || echo "")

if [ -z "$STARTUP_CMD" ]; then
  echo "❌ Could not generate startup command"
  echo "Trying alternative method..."
  
  # Create LaunchAgent manually
  PLIST_PATH="$HOME/Library/LaunchAgents/com.pm2.startup.plist"
  
  cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.pm2.startup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-c</string>
    <string>source ~/.zshrc 2>/dev/null || source ~/.bash_profile 2>/dev/null; export PATH="$PATH:/opt/homebrew/bin"; pm2 resurrect</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>/tmp/pm2-startup.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/pm2-startup.error.log</string>
</dict>
</plist>
EOF

  echo "✅ Created LaunchAgent plist at: $PLIST_PATH"
  echo ""
  echo "To activate, run:"
  echo "  launchctl bootstrap gui/$(id -u) $PLIST_PATH"
  echo ""
  echo "Or load it now? (This will make it start on boot)"
  read -p "Load now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH" 2>&1 || launchctl load "$PLIST_PATH" 2>&1
    echo "✅ LaunchAgent loaded!"
  fi
else
  echo "Run this command (it requires sudo):"
  echo ""
  echo "$STARTUP_CMD"
  echo ""
  echo "Note: The warning about LaunchDaemons vs LaunchAgents is normal for user-level services."
  echo "The setup should still work despite the warning."
fi

echo ""
echo "After setup, verify with:"
echo "  launchctl list | grep pm2"
echo "  pm2 list"
