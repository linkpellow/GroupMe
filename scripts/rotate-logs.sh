#!/bin/bash

# Log Rotation Script
# Moves current log files to dated archives and creates fresh log files

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current date in YYYYMMDD format
CURRENT_DATE=$(date +"%Y%m%d")

# Rotate client log if it exists and has content
if [ -s client.log ]; then
  echo "Rotating client.log to logs/client_${CURRENT_DATE}.log"
  cp client.log "logs/client_${CURRENT_DATE}.log"
  echo "Log rotated on $(date)" > client.log
fi

# Rotate server log if it exists and has content
if [ -s server.log ]; then
  echo "Rotating server.log to logs/server_${CURRENT_DATE}.log"
  cp server.log "logs/server_${CURRENT_DATE}.log"
  echo "Log rotated on $(date)" > server.log
fi

# Optional: clean up old logs (older than 30 days)
find logs/ -name "*.log" -type f -mtime +30 -delete

echo "Log rotation completed." 