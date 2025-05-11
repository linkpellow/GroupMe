#!/bin/bash

# Script to create a macOS application shortcut for Crokodial

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_NAME="Crokodial"
DESKTOP_DIR="$HOME/Desktop"
APP_PATH="$DESKTOP_DIR/$APP_NAME.app"
LOGO_PATH="$SCRIPT_DIR/dialer-app/client/public/images/HEADER LOGO 2.png"
LAUNCHER_SCRIPT="$SCRIPT_DIR/start-crokodial.sh"

# Check if the logo exists
if [ ! -f "$LOGO_PATH" ]; then
  echo "Error: Logo file not found at $LOGO_PATH"
  exit 1
fi

# Check if the launcher script exists
if [ ! -f "$LAUNCHER_SCRIPT" ]; then
  echo "Error: Launcher script not found at $LAUNCHER_SCRIPT"
  exit 1
fi

# Create the app bundle structure
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Create the app runner script
cat > "$APP_PATH/Contents/MacOS/AppRun" << EOL
#!/bin/bash
open -a Terminal.app "$LAUNCHER_SCRIPT"
EOL

# Make the runner script executable
chmod +x "$APP_PATH/Contents/MacOS/AppRun"

# Copy the icon to the app bundle
cp "$LOGO_PATH" "$APP_PATH/Contents/Resources/applet.icns"

# Create the Info.plist file
cat > "$APP_PATH/Contents/Info.plist" << EOL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AppRun</string>
    <key>CFBundleIconFile</key>
    <string>applet</string>
    <key>CFBundleIdentifier</key>
    <string>com.crokodial.launcher</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleSignature</key>
    <string>????</string>
</dict>
</plist>
EOL

echo "✅ Created $APP_NAME.app on your Desktop"
echo "🚀 Double-click to launch Crokodial servers" 