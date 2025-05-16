#!/bin/bash
# snapshot.sh - save current working state as 'working-snapshot' git tag

set -e

TAG_NAME="working-snapshot"
COMMIT_MSG="snapshot: automatically saved working state on $(date)"

# Stage all changes (tracked & untracked)
echo "Staging all changes..."
git add -A

# Commit
if git diff --cached --quiet; then
  echo "No changes to commit. Updating tag $TAG_NAME to current HEAD."
else
  echo "Creating commit..."
  git commit -m "$COMMIT_MSG"
fi

# Create / move tag
echo "Updating tag $TAG_NAME to point to $(git rev-parse --short HEAD)"
git tag -f "$TAG_NAME"

echo "✅ Snapshot saved. To restore run ./restore_snapshot.sh" 