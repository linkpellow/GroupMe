#!/bin/bash

# Script to create a macOS application for Crokodial using Automator

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_NAME="Crokodial"
DESKTOP_DIR="$HOME/Desktop"
APP_PATH="$DESKTOP_DIR/$APP_NAME.app"
LOGO_PATH="$SCRIPT_DIR/dialer-app/client/public/images/HEADER LOGO 2.png"
LAUNCHER_SCRIPT="$SCRIPT_DIR/start-crokodial.sh"
AUTOMATOR_FILE="$SCRIPT_DIR/CrokodialLauncher.workflow"

# Ensure our launcher script exists
if [ ! -f "$LAUNCHER_SCRIPT" ]; then
  echo "❌ Launcher script not found at $LAUNCHER_SCRIPT"
  exit 1
fi

# Ensure the logo exists
if [ ! -f "$LOGO_PATH" ]; then
  echo "❌ Logo file not found at $LOGO_PATH"
  echo "Searching for logo in images directory..."
  find "$SCRIPT_DIR/dialer-app/client/public/images" -name "*.png" -type f | while read -r img; do
    echo "Found: $img"
  done
  exit 1
fi

echo "✅ Found logo file: $LOGO_PATH"

# Create a temporary directory for the iconset
ICON_DIR="$SCRIPT_DIR/CrokodialIcon.iconset"
mkdir -p "$ICON_DIR"

# Create the iconset with proper quoting for paths with spaces
echo "🎨 Creating icon set from logo..."
sips -z 16 16     "$LOGO_PATH" --out "${ICON_DIR}/icon_16x16.png"
sips -z 32 32     "$LOGO_PATH" --out "${ICON_DIR}/icon_16x16@2x.png"
sips -z 32 32     "$LOGO_PATH" --out "${ICON_DIR}/icon_32x32.png"
sips -z 64 64     "$LOGO_PATH" --out "${ICON_DIR}/icon_32x32@2x.png"
sips -z 128 128   "$LOGO_PATH" --out "${ICON_DIR}/icon_128x128.png"
sips -z 256 256   "$LOGO_PATH" --out "${ICON_DIR}/icon_128x128@2x.png"
sips -z 256 256   "$LOGO_PATH" --out "${ICON_DIR}/icon_256x256.png"
sips -z 512 512   "$LOGO_PATH" --out "${ICON_DIR}/icon_256x256@2x.png"
sips -z 512 512   "$LOGO_PATH" --out "${ICON_DIR}/icon_512x512.png"
sips -z 1024 1024 "$LOGO_PATH" --out "${ICON_DIR}/icon_512x512@2x.png"

# Convert the iconset to icns file
ICNS_FILE="$SCRIPT_DIR/Crokodial.icns"
echo "🔄 Converting iconset to icns file..."
iconutil -c icns "$ICON_DIR" -o "$ICNS_FILE"

# Clean up the temporary iconset directory
rm -rf "$ICON_DIR"

# Create a simple Apple Script application
echo "📱 Creating Crokodial app with Apple Script..."

# Create a temporary script file
TEMP_SCRIPT="$SCRIPT_DIR/temp_app_script.scpt"

# Write the Apple Script
cat > "$TEMP_SCRIPT" << EOL
tell application "Terminal"
  do script "bash '$LAUNCHER_SCRIPT'"
end tell
EOL

# Compile the script into an app
TEMP_APP_PATH="$SCRIPT_DIR/$APP_NAME.app"
osacompile -o "$TEMP_APP_PATH" "$TEMP_SCRIPT"

# Remove the temporary script
rm "$TEMP_SCRIPT"

# Set the icon for the app
if [ -f "$ICNS_FILE" ]; then
  echo "🎨 Setting custom icon for $TEMP_APP_PATH..."
  cp "$ICNS_FILE" "$TEMP_APP_PATH/Contents/Resources/applet.icns"
  rm "$ICNS_FILE"
fi

# Move the app to the desktop
if [ -d "$TEMP_APP_PATH" ]; then
  if [ -d "$APP_PATH" ]; then
    echo "🗑️ Removing existing app at $APP_PATH..."
    rm -rf "$APP_PATH"
  fi
  echo "📦 Moving app to Desktop..."
  mv "$TEMP_APP_PATH" "$APP_PATH"
  echo "✅ Created $APP_NAME app on your Desktop!"
  echo "🚀 Double-click the app to launch Crokodial servers"
else
  echo "❌ Failed to create the app at $TEMP_APP_PATH"
  exit 1
fi 