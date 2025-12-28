#!/bin/bash
# Automatic rolling backup script for PostgreSQL database
# Keeps at least 2 days of backups OR 10 most recent backups, whichever is greater
# Designed to be run via cron or PM2 cron

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
MIN_DAYS=2
MIN_COUNT=10
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get database connection string from environment
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ Error: DATABASE_URL environment variable not set${NC}"
  exit 1
fi

# Extract database name from connection string
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
  echo -e "${RED}❌ Error: Could not extract database name from DATABASE_URL${NC}"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting automatic database backup..."
echo "   Database: $DB_NAME"
echo "   Backup directory: $BACKUP_DIR"

# Create backup using pg_dump
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"
BACKUP_METADATA="${BACKUP_DIR}/${BACKUP_NAME}.json"

# Extract connection details for pg_dump
# Handle both formats: postgresql://user@host:port/db and postgresql://user:pass@host:port/db
if echo "$DATABASE_URL" | grep -q "@"; then
  # Extract user, host, port, dbname
  CONN_STRING=$(echo "$DATABASE_URL" | sed 's|postgresql://||' | sed 's|?.*||')
  
  # Try pg_dump with connection string
  if pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null; then
    BACKUP_SUCCESS=true
  else
    # Fallback: try parsing connection string
    USER=$(echo "$CONN_STRING" | cut -d'@' -f1 | cut -d':' -f1)
    HOST_PORT_DB=$(echo "$CONN_STRING" | cut -d'@' -f2)
    HOST=$(echo "$HOST_PORT_DB" | cut -d':' -f1)
    PORT_DB=$(echo "$HOST_PORT_DB" | cut -d':' -f2)
    PORT=$(echo "$PORT_DB" | cut -d'/' -f1)
    DB=$(echo "$PORT_DB" | cut -d'/' -f2)
    
    if [ -n "$HOST" ] && [ -n "$DB" ]; then
      PGPASSWORD="" pg_dump -h "$HOST" -p "${PORT:-5432}" -U "$USER" -d "$DB" > "$BACKUP_FILE" 2>/dev/null && BACKUP_SUCCESS=true || BACKUP_SUCCESS=false
    else
      BACKUP_SUCCESS=false
    fi
  fi
else
  BACKUP_SUCCESS=false
fi

if [ "$BACKUP_SUCCESS" != "true" ]; then
  echo -e "${RED}❌ Error: Failed to create database backup${NC}"
  echo "   Attempted connection string: ${DATABASE_URL:0:50}..."
  exit 1
fi

# Get backup file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_SIZE_BYTES=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")

# Create metadata file
cat > "$BACKUP_METADATA" <<EOF
{
  "backupName": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database": "${DB_NAME}",
  "fileSize": ${BACKUP_SIZE_BYTES},
  "fileSizeHuman": "${FILE_SIZE}"
}
EOF

echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo "   File: $BACKUP_FILE"
echo "   Size: $FILE_SIZE"
echo "   Metadata: $BACKUP_METADATA"

# Cleanup old backups
echo ""
echo "🧹 Cleaning up old backups..."

# Calculate cutoff date (MIN_DAYS ago)
CUTOFF_DATE=$(date -v-${MIN_DAYS}d +%s 2>/dev/null || date -d "${MIN_DAYS} days ago" +%s 2>/dev/null || echo "0")

# Get all backup files sorted by modification time (newest first)
BACKUP_FILES=($(ls -t "${BACKUP_DIR}"/backup_*.sql 2>/dev/null || true))
TOTAL_BACKUPS=${#BACKUP_FILES[@]}

KEPT_COUNT=0
DELETED_COUNT=0

for backup_file in "${BACKUP_FILES[@]}"; do
  if [ ! -f "$backup_file" ]; then
    continue
  fi
  
  # Get file modification time
  FILE_TIME=$(stat -f%m "$backup_file" 2>/dev/null || stat -c%Y "$backup_file" 2>/dev/null || echo "0")
  FILE_AGE=$(( $(date +%s) - FILE_TIME ))
  FILE_AGE_DAYS=$(( FILE_AGE / 86400 ))
  
  # Determine if we should keep this backup
  KEEP=false
  
  # Keep if within MIN_DAYS
  if [ $FILE_AGE_DAYS -lt $MIN_DAYS ]; then
    KEEP=true
  fi
  
  # Keep if we haven't reached MIN_COUNT yet
  if [ $KEPT_COUNT -lt $MIN_COUNT ]; then
    KEEP=true
  fi
  
  if [ "$KEEP" = "true" ]; then
    KEPT_COUNT=$((KEPT_COUNT + 1))
  else
    # Delete backup file and metadata
    rm -f "$backup_file"
    METADATA_FILE="${backup_file%.sql}.json"
    rm -f "$METADATA_FILE"
    DELETED_COUNT=$((DELETED_COUNT + 1))
    echo "   🗑️  Deleted old backup: $(basename $backup_file) (${FILE_AGE_DAYS} days old)"
  fi
done

echo ""
echo "📊 Backup Summary:"
echo "   Total backups: $TOTAL_BACKUPS"
echo "   Kept: $KEPT_COUNT"
echo "   Deleted: $DELETED_COUNT"
echo ""
echo -e "${GREEN}✅ Backup process complete!${NC}"







