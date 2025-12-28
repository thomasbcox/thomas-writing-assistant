#!/bin/bash
# Setup automatic database backups using cron
# This script sets up a cron job to run backups every 6 hours

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/auto-backup-db.sh"
CRON_SCHEDULE="0 */6 * * *" # Every 6 hours

echo "🔧 Setting up automatic database backups..."

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "❌ Error: Backup script not found at $BACKUP_SCRIPT"
  exit 1
fi

# Make sure backup script is executable
chmod +x "$BACKUP_SCRIPT"

# Create cron job entry
CRON_ENTRY="$CRON_SCHEDULE cd $PROJECT_DIR && DATABASE_URL=\$(pm2 env 0 2>/dev/null | grep DATABASE_URL | cut -d' ' -f2) bash $BACKUP_SCRIPT >> $PROJECT_DIR/logs/backup-cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "auto-backup-db.sh"; then
  echo "⚠️  Cron job already exists. Removing old entry..."
  crontab -l 2>/dev/null | grep -v "auto-backup-db.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✅ Automatic backup configured!"
echo ""
echo "Schedule: Every 6 hours"
echo "Backup script: $BACKUP_SCRIPT"
echo "Log file: $PROJECT_DIR/logs/backup-cron.log"
echo ""
echo "To view cron jobs: crontab -l"
echo "To remove: crontab -l | grep -v 'auto-backup-db.sh' | crontab -"
echo ""
echo "To test backup manually:"
echo "  cd $PROJECT_DIR && npm run db:backup:auto"






