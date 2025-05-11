#!/bin/bash

# Replace these values with your actual GroupMe credentials
TOKEN="YOUR_GROUPME_TOKEN"
GROUP_ID="YOUR_GROUP_ID" 
BOT_NAME="CrokodialBot"
# Change this to your Render app URL once deployed
CALLBACK_URL="https://your-app-name.onrender.com/groupme/callback"

# Check if token is provided
if [ "$TOKEN" = "YOUR_GROUPME_TOKEN" ]; then
  echo "Error: Please edit this script and replace YOUR_GROUPME_TOKEN with your actual GroupMe API token"
  exit 1
fi

# Check if group ID is provided
if [ "$GROUP_ID" = "YOUR_GROUP_ID" ]; then
  echo "Error: Please edit this script and replace YOUR_GROUP_ID with your actual GroupMe group ID"
  echo "To list your groups, run: curl -s \"https://api.groupme.com/v3/groups?token=$TOKEN\" | jq"
  exit 1
fi

# Check if Render URL has been updated
if [ "$CALLBACK_URL" = "https://your-app-name.onrender.com/groupme/callback" ]; then
  echo "Error: Please edit this script and replace the CALLBACK_URL with your actual Render URL"
  echo "Example: https://groupme-webhook-abc123.onrender.com/groupme/callback"
  exit 1
fi

# Create the bot
echo "Creating GroupMe bot with callback URL: $CALLBACK_URL"
curl -s -X POST "https://api.groupme.com/v3/bots?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"bot\":{\"name\":\"$BOT_NAME\",\"group_id\":\"$GROUP_ID\",\"callback_url\":\"$CALLBACK_URL\"}}"

echo -e "\n\nIf successful, you'll receive a response with your bot details and bot_id."
echo "Save the bot_id to use in the send-groupme.sh script." 