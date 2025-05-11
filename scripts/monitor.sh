#!/bin/bash

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Set up log files
SERVER_LOG="logs/server.log"
CLIENT_LOG="logs/client.log"
ERROR_LOG="logs/error.log"

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to show a split view of logs
show_logs() {
  echo -e "${BLUE}=== Crokodial Log Monitor ===${NC}"
  echo -e "${GREEN}Monitoring server and client logs...${NC}"
  echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
  
  # Use tail to continuously monitor the logs
  tail -f "$SERVER_LOG" "$CLIENT_LOG" "$ERROR_LOG" | sed \
    -e "/error\|Error\|ERROR\|fail\|Fail\|FAIL\|exception\|Exception/" \
    -e "s/.*error.*/\\${RED}&\\${NC}/" \
    -e "s/.*Error.*/\\${RED}&\\${NC}/" \
    -e "s/.*ERROR.*/\\${RED}&\\${NC}/" \
    -e "s/.*fail.*/\\${RED}&\\${NC}/" \
    -e "s/.*Fail.*/\\${RED}&\\${NC}/" \
    -e "s/.*FAIL.*/\\${RED}&\\${NC}/" \
    -e "s/.*exception.*/\\${RED}&\\${NC}/" \
    -e "s/.*Exception.*/\\${RED}&\\${NC}/" \
    -e "s/.*warning.*/\\${YELLOW}&\\${NC}/" \
    -e "s/.*Warning.*/\\${YELLOW}&\\${NC}/" \
    -e "s/.*WARNING.*/\\${YELLOW}&\\${NC}/" \
    -e "s/.*success.*/\\${GREEN}&\\${NC}/" \
    -e "s/.*Success.*/\\${GREEN}&\\${NC}/" \
    -e "s/.*SUCCESS.*/\\${GREEN}&\\${NC}/"
}

# Function to start or restart the servers with logging
start_servers() {
  echo -e "${BLUE}Starting backend server...${NC}"
  cd "$(dirname "$0")/.." || exit
  # Kill any existing processes on port 3001
  kill $(lsof -ti :3001) 2>/dev/null || true
  
  # Start backend server with logging
  echo -e "$(date) - Starting server" > "$SERVER_LOG"
  PORT=3001 NODE_ENV=development MONGODB_URI=mongodb://localhost:27017/dialer_app JWT_SECRET=your-secret-key \
    DEBUG=* npm run dev 2>&1 | tee -a "$SERVER_LOG" &
  
  # Give the server time to start
  sleep 2
  
  echo -e "${BLUE}Starting frontend client...${NC}"
  # Kill any existing processes on port 5173
  kill $(lsof -ti :5173) 2>/dev/null || true
  
  # Change to client directory and start
  cd ../client || exit
  echo -e "$(date) - Starting client" > "$CLIENT_LOG"
  npm run dev 2>&1 | tee -a "$CLIENT_LOG" &
  
  # Go back to server directory
  cd ../server || exit
}

# Main function
main() {
  # Parse command-line arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --restart)
        start_servers
        shift
        ;;
      --server-only)
        echo -e "$(date) - Starting to monitor server logs" > "$SERVER_LOG"
        tail -f "$SERVER_LOG"
        shift
        ;;
      --client-only)
        echo -e "$(date) - Starting to monitor client logs" > "$CLIENT_LOG"
        tail -f "$CLIENT_LOG"
        shift
        ;;
      --errors-only)
        echo -e "$(date) - Starting to monitor error logs" > "$ERROR_LOG"
        # Grep for errors and warnings from both logs
        tail -f "$SERVER_LOG" "$CLIENT_LOG" | grep -E "error|Error|ERROR|fail|Fail|FAIL|exception|Exception|warning|Warning|WARNING" | tee -a "$ERROR_LOG"
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  # If no arguments were passed, show all logs
  show_logs
}

# Run the main function with all arguments
main "$@" 