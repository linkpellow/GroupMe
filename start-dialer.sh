#!/bin/bash

# This is a simple shortcut script that can be copied anywhere
# or aliased in your .zshrc or .bash_profile

# Full path to the main start script
MAIN_SCRIPT="/Users/linkpellow/Desktop/get it  2/dialer-app/start-shortcut.sh"

# Check if the main script exists
if [ ! -f "$MAIN_SCRIPT" ]; then
  echo "❌ Error: Main start script not found at $MAIN_SCRIPT"
  exit 1
fi

# Run the main script
exec "$MAIN_SCRIPT" 