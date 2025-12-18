#!/bin/bash
# Simple script to show database record counts via API

echo "Fetching database record counts..."
echo ""

# Try to get counts from the API endpoint
if curl -s http://localhost:3051/api/admin/db-stats > /dev/null 2>&1; then
  echo "=== Database Record Counts ==="
  echo ""
  curl -s http://localhost:3051/api/admin/db-stats | jq -r '
    "Table                    | Count",
    "-------------------------|-------",
    "Concept                  | \(.counts.Concept | tostring | ljust(5)) (\(.breakdowns.concepts.active) active, \(.breakdowns.concepts.trashed) trashed)",
    "Link                     | \(.counts.Link | tostring | ljust(5))",
    "Capsule                  | \(.counts.Capsule | tostring | ljust(5))",
    "Anchor                   | \(.counts.Anchor | tostring | ljust(5))",
    "RepurposedContent        | \(.counts.RepurposedContent | tostring | ljust(5))",
    "LinkName                 | \(.counts.LinkName | tostring | ljust(5))",
    "MRUConcept               | \(.counts.MRUConcept | tostring | ljust(5))",
    "",
    "=== Sample Data ===",
    "",
    "Sample Concepts:",
    (.samples.concepts[] | "  - [\(.status)] \(.title)"),
    "",
    "Sample Capsules:",
    (.samples.capsules[] | "  - \(.title)"),
    "",
    "Sample Links:",
    (.samples.links[] | "  - \(.source.title) --[\(.forwardName)]--> \(.target.title)")
  '
else
  echo "❌ Server not running. Please start the dev server first:"
  echo "   npm run dev"
  echo ""
  echo "Then run this script again, or visit:"
  echo "   http://localhost:3051/api/admin/db-stats"
fi
