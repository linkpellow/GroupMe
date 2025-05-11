#!/usr/bin/env bash

# ----------------------------------------------------------
# Starts your Node (or TS) server, mirrors everything that
# hits stderr (real-time errors) into a logfile **and** keeps
# streaming those updates so Cursor can see them instantly.
# ----------------------------------------------------------

# 1. Where you want the daily log written
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/server-$(date +%F).log"

# 2. Start the app (edit the command as needed)
#    -u forces line-buffered output so the stream is truly live
cd dialer-app/server && npm run dev 2>&1 | stdbuf -oL -eL tee -a "$LOG_FILE" 