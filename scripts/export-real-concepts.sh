#!/bin/bash
# Export real concepts (non-test records) to a backup file
# Usage: ./scripts/export-real-concepts.sh

set -e

DB_FILE="dev.db"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_FILE="${BACKUP_DIR}/real_concepts_${TIMESTAMP}.sql"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
  echo "Error: Database file $DB_FILE not found"
  exit 1
fi

echo "Exporting real concepts (non-test records)..."

# Export real concepts and their related data
sqlite3 "$DB_FILE" <<EOF > "$EXPORT_FILE"
-- Export real concepts (where creator != 'Test' AND source != 'Test')
.mode insert Concept
SELECT * FROM Concept WHERE creator != 'Test' AND source != 'Test';

-- Export links for real concepts
.mode insert Link
SELECT l.* FROM Link l
INNER JOIN Concept c1 ON l.sourceId = c1.id
INNER JOIN Concept c2 ON l.targetId = c2.id
WHERE c1.creator != 'Test' AND c1.source != 'Test'
  AND c2.creator != 'Test' AND c2.source != 'Test';

-- Export concept embeddings for real concepts
.mode insert ConceptEmbedding
SELECT ce.* FROM ConceptEmbedding ce
INNER JOIN Concept c ON ce.conceptId = c.id
WHERE c.creator != 'Test' AND c.source != 'Test';
EOF

# Also create a JSON export for easier inspection
JSON_FILE="${BACKUP_DIR}/real_concepts_${TIMESTAMP}.json"
sqlite3 -json "$DB_FILE" "SELECT * FROM Concept WHERE creator != 'Test' AND source != 'Test';" > "$JSON_FILE"

# Get file sizes
SQL_SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
JSON_SIZE=$(du -h "$JSON_FILE" | cut -f1)

# Count exported records
CONCEPT_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM Concept WHERE creator != 'Test' AND source != 'Test';")

echo ""
echo "✅ Real concepts exported successfully!"
echo "   SQL file: $EXPORT_FILE ($SQL_SIZE)"
echo "   JSON file: $JSON_FILE ($JSON_SIZE)"
echo "   Concepts exported: $CONCEPT_COUNT"
echo ""
echo "To restore these concepts, you would need to:"
echo "  1. Import the SQL file into a clean database"
echo "  2. Or manually insert the records using the JSON file as reference"

