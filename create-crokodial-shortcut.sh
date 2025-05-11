#!/bin/bash

# Simple script to create a desktop shortcut for Crokodial using AppleScript
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
APPLESCRIPT_FILE="$SCRIPT_DIR/create_crokodial_app.scpt"

cat > "$APPLESCRIPT_FILE" << EOL
tell application "Finder"
  set desktopPath to path to desktop folder as string
  set appPath to desktopPath & "$APP_NAME.app"
end tell

tell application "Script Editor"
  set newScript to "tell application \"Terminal\"
  do script \"$LAUNCHER_SCRIPT\"
  activate
end tell"
  
  set theScript to make new document with properties {text:newScript}
  save theScript in file appPath as "application"
  close theScript
end tell
EOL

# Run the AppleScript
echo "🔧 Creating the Crokodial desktop shortcut..."
osascript "$APPLESCRIPT_FILE"

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