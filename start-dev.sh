#!/bin/bash

# Kill existing processes if they exist
echo "🔄 Killing existing processes on port 3001 and 5173..."
kill $(lsof -ti :3001) 2>/dev/null || true
kill $(lsof -ti :5173) 2>/dev/null || true

# Store the current directory
ROOT_DIR=$(pwd)

# Start the server in the background
echo "🚀 Starting server on port 3001..."
cd "$ROOT_DIR/dialer-app/server" && npm start &
SERVER_PID=$!

# Wait a bit for the server to start
sleep 3

# Start the client in the foreground
echo "🚀 Starting client on port 5173..."
cd "$ROOT_DIR/dialer-app/client" && npm run dev

# When the client is killed, also kill the server
kill $SERVER_PID 2>/dev/null || true 