#!/bin/bash

# Simple script to create a desktop shortcut for Crokodial using osacompile
# This will auto-detect where the servers should run from

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_NAME="Crokodial"
DESKTOP_DIR="$HOME/Desktop"
APP_PATH="$DESKTOP_DIR/$APP_NAME.app"
LAUNCHER_SCRIPT="$SCRIPT_DIR/start-crokodial.sh"

# Check if the launcher script exists
if [ ! -f "$LAUNCHER_SCRIPT" ]; then
  echo "❌ Error: Launcher script not found at $LAUNCHER_SCRIPT"
  exit 1
fi

# Make the launcher script executable
chmod +x "$LAUNCHER_SCRIPT"

# Create the AppleScript file
APPLESCRIPT_FILE="$SCRIPT_DIR/crokodial_launcher.applescript"

cat > "$APPLESCRIPT_FILE" << EOL
tell application "Terminal"
  do script "$LAUNCHER_SCRIPT"
  activate
end tell
EOL

# Compile the AppleScript into an application
echo "🔧 Creating the Crokodial desktop shortcut..."
osacompile -o "$APP_PATH" "$APPLESCRIPT_FILE"

# Clean up the AppleScript file
rm "$APPLESCRIPT_FILE"

# Check if the app was created successfully
if [ -d "$APP_PATH" ]; then
  echo "✅ Successfully created $APP_NAME app on your Desktop!"
  echo "🚀 Double-click to launch Crokodial servers"
else
  echo "❌ Failed to create the app. Please try running the script manually:"
  echo "   $LAUNCHER_SCRIPT"
fi 