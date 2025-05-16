#!/bin/bash

FG_RED='\033[0;31m'
FG_GREEN='\033[0;32m'
FG_YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" &> /dev/null && pwd)"

echo -e "${FG_YELLOW}=== CROKODIAL GROUPME FIX: STARTING ===${NC}"
echo -e "Script directory: ${SCRIPT_DIR}"

# 1. Force kill ALL Node.js and nodemon processes
echo -e "${FG_YELLOW}Step 1: Forcefully terminating all Node.js and nodemon processes...${NC}"
killall -9 node 2>/dev/null || echo "No 'node' processes to kill."
killall -9 nodemon 2>/dev/null || echo "No 'nodemon' processes to kill."
ps aux | grep -E '(node|nodemon)' | grep -v grep || echo "Verification: No node/nodemon processes found."
echo -e "${FG_GREEN}Node processes terminated.${NC}"
sleep 1

# 2. Start the simple server (go.cjs)
cd "${SCRIPT_DIR}"
echo -e "${FG_YELLOW}Step 2: Starting simple server (go.cjs) in the background...${NC}"
node go.cjs & 
SERVER_PID=$!
echo -e "Simple server started with PID: ${SERVER_PID}. Logs will appear below if it runs correctly." 
echo -e "Waiting a few seconds for server to initialize..."
sleep 3 # Give server time to start

# Check if server is up
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo -e "${FG_RED}ERROR: Simple server (go.cjs) FAILED to start or crashed immediately.${NC}"
  echo -e "${FG_RED}Please check for errors above this message. Exiting.${NC}"
  exit 1
fi
echo -e "${FG_GREEN}Simple server (go.cjs) is running.${NC}"

# 3. Start the Vite client dev server
CLIENT_DIR="${SCRIPT_DIR}/dialer-app/client"
echo -e "${FG_YELLOW}Step 3: Starting Vite client dev server from ${CLIENT_DIR}...${NC}"
cd "${CLIENT_DIR}"

# Kill anything on client port just in case
CLIENT_PORT=5173
LSOF_OUTPUT=$(lsof -ti :${CLIENT_PORT} 2>/dev/null)
if [ -n "$LSOF_OUTPUT" ]; then
  echo -e "${FG_YELLOW}Port ${CLIENT_PORT} is in use. Attempting to free it...${NC}"
  kill -9 $LSOF_OUTPUT || echo "Failed to kill process on port ${CLIENT_PORT}, it might have already exited."
  sleep 1
fi

# Run npm install in client directory just to be safe
echo -e "${FG_YELLOW}Running npm install in client directory (just in case)...${NC}"
npm install

echo -e "${FG_GREEN}Starting Vite client (npm run dev). This will take over the terminal...${NC}"
npm run dev

# Cleanup: When npm run dev (client) is stopped (e.g., Ctrl+C), kill the server
echo -e "${FG_YELLOW}Client process ended. Stopping the simple server (PID: ${SERVER_PID})...${NC}"
kill $SERVER_PID 2>/dev/null || echo "Server already stopped or PID ${SERVER_PID} not found."
echo -e "${FG_GREEN}=== CROKODIAL GROUPME FIX: COMPLETED ===${NC}" 