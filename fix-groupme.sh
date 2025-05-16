#!/bin/bash

# Force kill all node processes
echo "Killing all Node processes..."
sudo killall -9 node 2>/dev/null || true
sleep 2

# Go to the project directory
cd "$(dirname "$0")"
echo "Current directory: $(pwd)"

# Start the server
echo "Starting server..."
node server.cjs 