#!/bin/bash
# restore_snapshot.sh - restore repository to the 'working-snapshot' git tag

set -e

tag="working-snapshot"

if ! git rev-parse "$tag" >/dev/null 2>&1; then
  echo "❌ Tag '$tag' does not exist. Cannot restore."
  exit 1
fi

read -p "This will discard ALL uncommitted changes and restore to '$tag'. Continue? (y/N): " -r reply
if [[ ! $reply =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Cleaning untracked files..."
git clean -fd

echo "Resetting to $tag..."
git reset --hard "$tag"

echo "✅ Repository restored to tag '$tag'." 