#!/bin/bash

# GroupMe Testing Environment Script
# This script sets up a stable testing environment for GroupMe development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 GroupMe Testing Environment Setup${NC}"
echo "====================================="

# Configuration
export JWT_SECRET="lkj234lkjfdslkj234lkjadsflkjfdaslkjfdalskdfj"
export GROUPME_CLIENT_ID="m30BXQSEw03mzZK0ZfzDGQqqp8LXHRT2MiZNWWCeC7jmBSAx"
export GROUPME_REDIRECT_URI="http://localhost:5173/groupme/callback"
export FRONTEND_URL="http://localhost:5173"
export MONGODB_URI="mongodb://localhost:27017/dialer"
export PORT="3001"
export NODE_ENV="development"
export LOG_LEVEL="debug"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}Port $port is available${NC}"
        return 0
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}Killing processes on port $port: $pids${NC}"
        kill -9 $pids 2>/dev/null || true
        sleep 1
    fi
}

# Function to start backend with auto-restart
start_backend() {
    echo -e "${GREEN}Starting backend server with auto-restart...${NC}"
    
    # Use nodemon for auto-restart on crashes
    npx nodemon \
        --watch dist \
        --exec "node dist/index.js" \
        --delay 2 \
        --env JWT_SECRET="$JWT_SECRET" \
        --env GROUPME_CLIENT_ID="$GROUPME_CLIENT_ID" \
        --env GROUPME_REDIRECT_URI="$GROUPME_REDIRECT_URI" \
        --env FRONTEND_URL="$FRONTEND_URL" \
        --env MONGODB_URI="$MONGODB_URI" \
        --env PORT="$PORT" \
        --env NODE_ENV="$NODE_ENV" \
        > logs/backend-test.log 2>&1 &
    
    local backend_pid=$!
    echo "Backend PID: $backend_pid"
    
    # Wait for backend to start
    local count=0
    while ! curl -s http://localhost:3001/api/health > /dev/null && [ $count -lt 30 ]; do
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo -e "\n${GREEN}✓ Backend is running${NC}"
        return 0
    else
        echo -e "\n${RED}✗ Backend failed to start${NC}"
        return 1
    fi
}

# Main setup
echo -e "${YELLOW}Step 1: Cleaning up existing processes${NC}"
kill_port 3001

echo -e "${YELLOW}Step 2: Building backend${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Check TypeScript errors above${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 3: Creating log directory${NC}"
mkdir -p logs

echo -e "${YELLOW}Step 4: Starting backend${NC}"
if start_backend; then
    echo -e "${GREEN}✅ Backend is ready for testing!${NC}"
    echo ""
    echo "Environment Variables Set:"
    echo "  JWT_SECRET: [SET]"
    echo "  GROUPME_CLIENT_ID: ${GROUPME_CLIENT_ID}"
    echo "  GROUPME_REDIRECT_URI: ${GROUPME_REDIRECT_URI}"
    echo "  MONGODB_URI: ${MONGODB_URI}"
    echo ""
    echo "Test URLs:"
    echo "  Health Check: http://localhost:3001/api/health"
    echo "  OAuth Initiate: http://localhost:3001/api/groupme/oauth/initiate"
    echo ""
    echo "Logs:"
    echo "  tail -f logs/backend-test.log"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    
    # Keep script running
    tail -f logs/backend-test.log
else
    echo -e "${RED}Failed to start backend${NC}"
    exit 1
fi 