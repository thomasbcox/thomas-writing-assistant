#!/bin/bash
# Backup database script
# Usage: ./scripts/backup-db.sh [backup-name]

set -e

DB_FILE="dev.db"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup_${TIMESTAMP}}"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
  echo "Error: Database file $DB_FILE not found"
  exit 1
fi

# Create backup
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.db"
cp "$DB_FILE" "$BACKUP_FILE"

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Database backed up successfully!"
echo "   File: $BACKUP_FILE"
echo "   Size: $FILE_SIZE"
echo ""
echo "To restore: cp $BACKUP_FILE $DB_FILE"

