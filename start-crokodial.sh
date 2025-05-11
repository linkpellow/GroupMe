#!/bin/bash

# Script to launch both frontend and backend for Crokodial
# Created to auto-detect project location regardless of where it's moved

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to find the dialer-app directory starting from the script location
find_dialer_app() {
  local current_dir="$1"
  
  # Check if we're in the dialer-app directory
  if [ -d "${current_dir}/dialer-app" ]; then
    echo "${current_dir}/dialer-app"
    return 0
  fi
  
  # Check if we are the dialer-app directory
  if [ "$(basename "$current_dir")" = "dialer-app" ]; then
    echo "$current_dir"
    return 0
  fi
  
  # Exit if we reached the filesystem root
  if [ "$current_dir" = "/" ]; then
    return 1
  fi
  
  # Recursively check parent directory
  find_dialer_app "$(dirname "$current_dir")"
}

# Function to forcefully kill processes using a specific port
force_kill_port() {
  local port=$1
  echo "🔪 Forcefully killing any process using port $port..."
  
  # First attempt - standard kill
  local pids=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "Found PIDs: $pids - attempting to kill..."
    kill $pids 2>/dev/null || true
    sleep 1
  fi
  
  # Second attempt - kill -9
  pids=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "Processes still running, attempting with kill -9..."
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
  
  # Check if port is still in use
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️ Port $port still in use after kill attempts"
    return 1
  else
    echo "✅ Port $port is now free"
    return 0
  fi
}

# Function to check if the client app is responsive
check_client_responsive() {
  # Use curl with a 2-second timeout to check if the client is responding
  if curl -s "http://localhost:5173" -m 2 >/dev/null 2>&1; then
    return 0  # Client is responsive (success)
  else
    return 1  # Client is not responsive (failure)
  fi
}

# Function to open the browser
open_browser() {
  echo "🌐 Opening Crokodial in your browser..."
  sleep 2
  if [[ "$OSTYPE" == "darwin"* ]]; then  # macOS
    open "http://localhost:5173"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then  # Linux
    xdg-open "http://localhost:5173" &>/dev/null
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then  # Windows
    start "http://localhost:5173"
  fi
}

# Find the dialer-app directory
DIALER_APP_DIR=$(find_dialer_app "$SCRIPT_DIR")

if [ -z "$DIALER_APP_DIR" ]; then
  osascript -e 'display notification "Could not find dialer-app directory" with title "Crokodial Error"'
  exit 1
fi

echo "🐊 Starting Crokodial Dialer App..."
echo "📂 Project found at: $DIALER_APP_DIR"

# Stop all Node.js processes that might be using the ports
echo "🧹 Killing all Node.js processes that might be using our ports..."
pkill -f "node.*vite" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "ts-node" 2>/dev/null || true
sleep 1

# Ensure ports are free
force_kill_port 3001
force_kill_port 5173

# Double check both ports
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️ Attempting final nuclear option to free ports..."
  
  # Kill any process using those ports with the strongest force
  lsof -ti :3001,5173 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  
  # Use a more aggressive approach if needed - this will kill ALL node processes
  if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🧨 Using killall on Node processes as requested..."
    killall node 2>/dev/null || true
    sleep 2
  fi
fi

# Start the server
echo "🚀 Starting server..."
cd "$DIALER_APP_DIR/server" && npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Start the client
echo "🚀 Starting client..."
cd "$DIALER_APP_DIR/client" && npm run dev &
CLIENT_PID=$!

# Wait a moment for the client to start
sleep 5

# Check if client has started successfully
MAX_ATTEMPTS=10
ATTEMPTS=0
CLIENT_STARTED=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  if check_client_responsive; then
    CLIENT_STARTED=true
    break
  fi
  echo "⏳ Waiting for client to start... (attempt $((ATTEMPTS+1))/$MAX_ATTEMPTS)"
  
  # If we're on attempt 5, try to restart client
  if [ $ATTEMPTS -eq 5 ]; then
    echo "🔄 Client not responding after several attempts, trying to restart..."
    kill $CLIENT_PID 2>/dev/null || true
    force_kill_port 5173
    cd "$DIALER_APP_DIR/client" && npm run dev &
    CLIENT_PID=$!
    sleep 5
  fi
  
  sleep 2
  ATTEMPTS=$((ATTEMPTS+1))
done

# Notify user
if [ "$CLIENT_STARTED" = true ]; then
  osascript -e 'display notification "Crokodial is now running" with title "Crokodial Started"'
  echo "✅ Crokodial is running!"
  echo "🌐 Server: http://localhost:3001"
  echo "🌐 Client: http://localhost:5173"
  open_browser
else
  osascript -e 'display notification "Client failed to start properly. Try accessing the app directly." with title "Crokodial Warning"'
  echo "⚠️ Client may not have started properly, but you can try accessing the app directly."
  echo "🌐 Try opening: http://localhost:5173"
  open_browser
fi

echo ""
echo "💡 Press Ctrl+C to stop processes"

# Wait for user to press Ctrl+C
trap "[ -n \"$SERVER_PID\" ] && kill $SERVER_PID 2>/dev/null || true; [ -n \"$CLIENT_PID\" ] && kill $CLIENT_PID 2>/dev/null || true; echo '👋 Goodbye!'; exit" INT
wait 