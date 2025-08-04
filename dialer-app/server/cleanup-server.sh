#!/bin/bash

# Server Cleanup Script
# This script will organize the server directory by moving utility scripts to proper folders

echo "🧹 Starting server directory cleanup..."

# Create organized directories
mkdir -p dialer-app/server/scripts/migration
mkdir -p dialer-app/server/scripts/analysis
mkdir -p dialer-app/server/scripts/fixes
mkdir -p dialer-app/server/scripts/tests
mkdir -p dialer-app/server/dev-tools

# Move migration scripts
echo "📦 Moving migration scripts..."
mv dialer-app/server/import-*.js dialer-app/server/scripts/migration/ 2>/dev/null || true
mv dialer-app/server/reimport-*.js dialer-app/server/scripts/migration/ 2>/dev/null || true
mv dialer-app/server/seed-*.js dialer-app/server/scripts/migration/ 2>/dev/null || true

# Move analysis scripts
echo "🔍 Moving analysis scripts..."
mv dialer-app/server/analyze-*.js dialer-app/server/scripts/analysis/ 2>/dev/null || true
mv dialer-app/server/check-*.js dialer-app/server/scripts/analysis/ 2>/dev/null || true
mv dialer-app/server/find-*.js dialer-app/server/scripts/analysis/ 2>/dev/null || true
mv dialer-app/server/deep-*.js dialer-app/server/scripts/analysis/ 2>/dev/null || true
mv dialer-app/server/list-*.js dialer-app/server/scripts/analysis/ 2>/dev/null || true

# Move fix scripts
echo "🔧 Moving fix scripts..."
mv dialer-app/server/fix-*.js dialer-app/server/scripts/fixes/ 2>/dev/null || true
mv dialer-app/server/update-*.js dialer-app/server/scripts/fixes/ 2>/dev/null || true
mv dialer-app/server/delete-*.js dialer-app/server/scripts/fixes/ 2>/dev/null || true
mv dialer-app/server/remove-*.js dialer-app/server/scripts/fixes/ 2>/dev/null || true
mv dialer-app/server/reset-*.js dialer-app/server/scripts/fixes/ 2>/dev/null || true

# Move test scripts
echo "🧪 Moving test scripts..."
mv dialer-app/server/test-*.js dialer-app/server/scripts/tests/ 2>/dev/null || true

# Move development server files
echo "🛠️ Moving development tools..."
mv dialer-app/server/dev-server.js dialer-app/server/dev-tools/ 2>/dev/null || true
mv dialer-app/server/server.js dialer-app/server/dev-tools/ 2>/dev/null || true
mv dialer-app/server/simple-upload.js dialer-app/server/dev-tools/ 2>/dev/null || true
mv dialer-app/server/upload-server.js dialer-app/server/dev-tools/ 2>/dev/null || true
mv dialer-app/server/verify-token.js dialer-app/server/dev-tools/ 2>/dev/null || true
mv dialer-app/server/start-server-bypass.js dialer-app/server/dev-tools/ 2>/dev/null || true

# Remove the conflicting env.js file (using centralized config now)
echo "🗑️ Removing conflicting env.js..."
rm -f dialer-app/server/env.js

# Clean up old logs
echo "📝 Cleaning up logs..."
rm -f dialer-app/server/*.log

echo "✅ Server cleanup complete!"
echo ""
echo "📊 Summary:"
echo "- Migration scripts moved to: scripts/migration/"
echo "- Analysis scripts moved to: scripts/analysis/"
echo "- Fix scripts moved to: scripts/fixes/"
echo "- Test scripts moved to: scripts/tests/"
echo "- Dev tools moved to: dev-tools/"
echo ""
echo "⚠️  Note: The main production server is in src/index.ts"
echo "⚠️  All other server files have been moved to organized folders" 