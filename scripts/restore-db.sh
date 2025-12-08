#!/bin/bash
# Restore database script
# Usage: ./scripts/restore-db.sh [backup-file]

set -e

DB_FILE="dev.db"
BACKUP_DIR="backups"

if [ -z "$1" ]; then
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/*.db 2>/dev/null | awk '{print $9, "(" $5 ")"}'
  echo ""
  echo "Usage: ./scripts/restore-db.sh [backup-file]"
  exit 1
fi

BACKUP_FILE="$1"

# If relative path, assume it's in backups directory
if [ ! -f "$BACKUP_FILE" ] && [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
  BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file $BACKUP_FILE not found"
  exit 1
fi

# Create a backup of current database before restoring
if [ -f "$DB_FILE" ]; then
  CURRENT_BACKUP="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).db"
  cp "$DB_FILE" "$CURRENT_BACKUP"
  echo "📦 Current database backed up to: $CURRENT_BACKUP"
fi

# Restore
cp "$BACKUP_FILE" "$DB_FILE"

echo "✅ Database restored from: $BACKUP_FILE"
echo ""
echo "⚠️  Note: You may need to run migrations if schema changed:"
echo "   npm run db:migrate"

