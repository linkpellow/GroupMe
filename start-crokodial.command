#!/bin/bash

# Script to start Crokodial Dialer App with one click
# Created by Cursor for Link

# Clear the terminal and show welcome message
clear
echo "🐊 Starting Crokodial Dialer App..."
echo "======================================"

# Set the path to the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

# Kill any existing node processes
echo "🧹 Cleaning up previous instances..."
killall node 2>/dev/null || true

# First, start the server
echo "🚀 Starting server..."
cd "$PROJECT_DIR/dialer-app/server"
npm run start &
SERVER_PID=$!

# Wait a moment for the server to initialize
echo "⏳ Waiting for server to start..."
sleep 3

# Then start the client
echo "🚀 Starting client..."
cd "$PROJECT_DIR/dialer-app/client"
npm run dev &
CLIENT_PID=$!

# Show success message with URLs
echo ""
echo "✅ Both server and client are running!"
echo "🌐 Server: http://localhost:3001"
echo "🌐 Client: http://localhost:5173"
echo ""
echo "💡 This window will show any errors or logs while the servers are running."
echo "💡 Close this window to stop both processes when done."
echo ""

# Function to clean up when script is terminated
cleanup() {
  echo "👋 Shutting down servers..."
  kill $SERVER_PID $CLIENT_PID 2>/dev/null
  exit 0
}

# Set trap to call cleanup function when terminal is closed
trap cleanup INT TERM

# Keep script running to maintain the processes
wait 