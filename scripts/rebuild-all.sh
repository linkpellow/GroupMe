#!/bin/bash

# Rebuild script for dialer application
# This script rebuilds both the client and server components

echo "🔄 Starting complete rebuild of dialer application..."

# Navigate to the root directory
cd "$(dirname "$0")/.."

# Rebuild server
echo "📦 Rebuilding server..."
cd dialer-app/server
npm run rebuild
if [ $? -ne 0 ]; then
  echo "❌ Server rebuild failed"
  exit 1
fi
echo "✅ Server rebuild completed successfully"

# Return to root and rebuild client
echo "📱 Rebuilding client..."
cd ../../dialer-app/client
npm run rebuild
if [ $? -ne 0 ]; then
  echo "❌ Client rebuild failed"
  exit 1
fi
echo "✅ Client rebuild completed successfully"

echo "🎉 Rebuild completed successfully!"
echo "You can now start the application with the start-dialer.sh script" 