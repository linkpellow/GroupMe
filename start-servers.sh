#!/bin/bash

# Unified Server Startup Script
# This script provides options to start different server components

# Default configuration
MODE="all"
DEV_MODE=false

# Kill any existing processes
kill_processes() {
  echo "Killing any existing processes on ports 3001, 3002, 3005, and 5173..."
  kill $(lsof -ti:3001) 2>/dev/null || true
  kill $(lsof -ti:3002) 2>/dev/null || true
  kill $(lsof -ti:3005) 2>/dev/null || true
  kill $(lsof -ti:5173) 2>/dev/null || true
  sleep 1
}

# Show usage information
show_usage() {
  echo "Dialer App Server Starter"
  echo ""
  echo "Usage: ./start-servers.sh [options]"
  echo ""
  echo "Options:"
  echo "  --dev               Run in development mode with mock data"
  echo "  --prod              Run in production mode (default)"
  echo "  --mode=<mode>       Specify which components to run:"
  echo "                       all       - Run all components (default)"
  echo "                       client    - Run only the client"
  echo "                       server    - Run only the main server"
  echo "                       file      - Run only the file service"
  echo "                       groupme   - Run only the GroupMe service"
  echo ""
  echo "Examples:"
  echo "  ./start-servers.sh                   # Run all in production mode"
  echo "  ./start-servers.sh --dev             # Run all in development mode"
  echo "  ./start-servers.sh --mode=client     # Run only the client"
  echo "  ./start-servers.sh --dev --mode=server  # Run only the server in dev mode"
  echo ""
}

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --dev)
      DEV_MODE=true
      shift
      ;;
    --prod)
      DEV_MODE=false
      shift
      ;;
    --mode=*)
      MODE="${arg#*=}"
      shift
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      show_usage
      exit 1
      ;;
  esac
done

# Kill existing processes
kill_processes

# Set root directory
ROOT_DIR="$(pwd)"

# Start components based on mode and development status
if [ "$MODE" = "all" ] || [ "$MODE" = "server" ]; then
  echo "🚀 Starting server..."
  cd "$ROOT_DIR/dialer-app/server"
  
  if [ "$DEV_MODE" = true ]; then
    echo "Running in development mode with mock data"
    npm run dev:mock &
  else
    npm run dev &
  fi
  
  SERVER_PID=$!
  # Give the server more time to start up
  sleep 5
fi

if [ "$MODE" = "all" ] || [ "$MODE" = "file" ]; then
  echo "🚀 Starting file service..."
  cd "$ROOT_DIR/dialer-app/server" && npm run services:file &
  FILE_PID=$!
  sleep 3
fi

if [ "$MODE" = "all" ] || [ "$MODE" = "groupme" ]; then
  echo "🚀 Starting GroupMe service..."
  cd "$ROOT_DIR/dialer-app/server" && npm run services:groupme &
  GROUPME_PID=$!
  sleep 3
fi

if [ "$MODE" = "all" ] || [ "$MODE" = "client" ]; then
  echo "🚀 Starting client..."
  cd "$ROOT_DIR/dialer-app/client" && npm run dev &
  CLIENT_PID=$!
  sleep 2
fi

echo ""
echo "✅ Servers started successfully"
echo "Press Ctrl+C to stop all servers"

# Wait for user to press Ctrl+C
trap "echo 'Stopping all servers...'; kill $CLIENT_PID $SERVER_PID $FILE_PID $GROUPME_PID 2>/dev/null" INT
wait 