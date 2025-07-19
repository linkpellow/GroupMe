#!/bin/bash

# Fix lockfile for cross-platform compatibility (macOS/Windows dev + Linux production)
# This script regenerates package-lock.json in a Linux environment to ensure
# all platform-specific optional dependencies are included

set -e

echo "🔧 Fixing lockfile for cross-platform compatibility..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required. Please install Docker Desktop."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

echo "📦 Removing existing lockfile and node_modules..."
rm -rf package-lock.json node_modules
rm -rf dialer-app/client/node_modules
rm -rf dialer-app/server/node_modules

echo "🐧 Regenerating lockfile in Linux environment..."
docker run --rm \
    -v "$PWD":/app \
    -w /app \
    --platform linux/amd64 \
    node:18-alpine \
    sh -c "npm install --legacy-peer-deps"

echo "✅ Lockfile regenerated for Linux compatibility!"
echo "📝 Next steps:"
echo "   1. Commit the updated package-lock.json"
echo "   2. Push to your branch"
echo "   3. Deploy to Heroku" 