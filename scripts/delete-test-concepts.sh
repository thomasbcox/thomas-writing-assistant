#!/bin/bash
# Delete test concepts from the database
# This script removes all concepts where creator='Test' OR source='Test'
# Usage: ./scripts/delete-test-concepts.sh [--dry-run]

set -e

DB_FILE="dev.db"
DRY_RUN=false

# Check for dry-run flag
if [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No changes will be made"
  echo ""
fi

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
  echo "Error: Database file $DB_FILE not found"
  exit 1
fi

# Count test concepts
TEST_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Concept WHERE creator = 'Test' OR source = 'Test';")
REAL_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Concept WHERE creator != 'Test' AND source != 'Test';")

echo "Database: $DB_FILE"
echo "Test concepts to delete: $TEST_COUNT"
echo "Real concepts to keep: $REAL_COUNT"
echo ""

if [ "$TEST_COUNT" -eq 0 ]; then
  echo "No test concepts found. Nothing to delete."
  exit 0
fi

if [ "$DRY_RUN" = true ]; then
  echo "Would delete the following test concepts:"
  sqlite3 "$DB_FILE" "SELECT id, title, identifier FROM Concept WHERE creator = 'Test' OR source = 'Test' LIMIT 10;"
  if [ "$TEST_COUNT" -gt 10 ]; then
    echo "... and $((TEST_COUNT - 10)) more"
  fi
  echo ""
  echo "Run without --dry-run to actually delete them."
else
  # Confirm deletion
  echo "⚠️  WARNING: This will permanently delete $TEST_COUNT test concepts!"
  echo "   Real concepts ($REAL_COUNT) will be preserved."
  echo ""
  read -p "Are you sure you want to continue? (yes/no): " confirm
    
  if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
  fi

  # Create a backup first
  BACKUP_DIR="backups"
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="${BACKUP_DIR}/dev.db.before_test_deletion_${TIMESTAMP}"
  mkdir -p "$BACKUP_DIR"
  cp "$DB_FILE" "$BACKUP_FILE"
  echo "✅ Backup created: $BACKUP_FILE"
  echo ""

  # Delete test concepts
  # Note: We need to delete related records first due to foreign key constraints
  echo "Deleting test concepts and related data..."
  
  sqlite3 "$DB_FILE" <<EOF
-- Disable foreign key checks temporarily
PRAGMA foreign_keys = OFF;

-- Delete concept embeddings for test concepts
DELETE FROM ConceptEmbedding 
WHERE conceptId IN (SELECT id FROM Concept WHERE creator = 'Test' OR source = 'Test');

-- Delete links involving test concepts
DELETE FROM Link 
WHERE sourceId IN (SELECT id FROM Concept WHERE creator = 'Test' OR source = 'Test')
   OR targetId IN (SELECT id FROM Concept WHERE creator = 'Test' OR source = 'Test');

-- Delete chat sessions for test concepts
DELETE FROM ChatSession 
WHERE conceptId IN (SELECT id FROM Concept WHERE creator = 'Test' OR source = 'Test');

-- Delete MRU concepts for test concepts
DELETE FROM MRUConcept 
WHERE conceptId IN (SELECT id FROM Concept WHERE creator = 'Test' OR source = 'Test');

-- Finally, delete the test concepts themselves
DELETE FROM Concept WHERE creator = 'Test' OR source = 'Test';

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;
EOF

  # Verify deletion
  REMAINING_TEST=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Concept WHERE creator = 'Test' OR source = 'Test';")
  REMAINING_REAL=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Concept WHERE creator != 'Test' AND source != 'Test';")

  echo ""
  echo "✅ Deletion complete!"
  echo "   Test concepts remaining: $REMAINING_TEST"
  echo "   Real concepts remaining: $REMAINING_REAL"
  echo ""
  echo "Backup saved at: $BACKUP_FILE"
  echo "To restore: cp $BACKUP_FILE $DB_FILE"
fi

