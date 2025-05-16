#!/bin/bash

# Create a Crokodial desktop shortcut for macOS

# Get absolute paths
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_SCRIPT="${CURRENT_DIR}/start-servers.sh"
ICON_PATH="${CURRENT_DIR}/dialer-app/client/public/assets/icon.png"
DESKTOP_PATH="${HOME}/Desktop"
APP_NAME="Crokodial"

# Make sure the start script is executable
chmod +x "${START_SCRIPT}"

# Create the AppleScript content
APPLESCRIPT="""
tell application \"Terminal\"
    activate
    do script \"cd ${CURRENT_DIR} && ./start-servers.sh --dev\"
    set miniaturized of window 1 to true
end tell
"""

# Create a temporary AppleScript file
TEMP_SCRIPT="/tmp/crokodial_script.scpt"
echo "${APPLESCRIPT}" > "${TEMP_SCRIPT}"

# Create the application bundle directory structure
APP_DIR="${DESKTOP_PATH}/${APP_NAME}.app"
mkdir -p "${APP_DIR}/Contents/MacOS"
mkdir -p "${APP_DIR}/Contents/Resources"

# Create the Info.plist file
cat > "${APP_DIR}/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>crokodial-launcher</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.crokodial.app</string>
    <key>CFBundleName</key>
    <string>Crokodial</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
</dict>
</plist>
EOF

# Create the launcher script
cat > "${APP_DIR}/Contents/MacOS/crokodial-launcher" << EOF
#!/bin/bash
osascript "${TEMP_SCRIPT}"
EOF

# Make the launcher script executable
chmod +x "${APP_DIR}/Contents/MacOS/crokodial-launcher"

# Copy the icon if it exists, otherwise use a generic one
if [ -f "${ICON_PATH}" ]; then
    cp "${ICON_PATH}" "${APP_DIR}/Contents/Resources/AppIcon.icns"
else
    # Use a generic icon (temporarily use script file)
    touch "${APP_DIR}/Contents/Resources/AppIcon.icns"
fi

echo "Created Crokodial desktop shortcut at: ${APP_DIR}"
echo "Double-click to start the application" 