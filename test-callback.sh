#!/bin/bash

# The URL to the callback endpoint - update this with your Render URL
CALLBACK_URL="https://your-app-name.onrender.com/groupme/callback"

# Check if Render URL has been updated
if [ "$CALLBACK_URL" = "https://your-app-name.onrender.com/groupme/callback" ]; then
  echo "Error: Please edit this script and replace the CALLBACK_URL with your actual Render URL"
  echo "Example: https://groupme-webhook-abc123.onrender.com/groupme/callback"
  exit 1
fi

# Sample GroupMe webhook payload
echo "Sending test webhook to $CALLBACK_URL"
curl -s -X POST "$CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "attachments": [],
    "avatar_url": "https://i.groupme.com/123456789",
    "created_at": 1613406927,
    "group_id": "1234567890",
    "id": "1234567890",
    "name": "Test User",
    "sender_id": "1234567890",
    "sender_type": "user",
    "source_guid": "GUID",
    "text": "This is a test message",
    "user_id": "1234567890"
  }'

echo -e "\n\nCheck your Render logs to see if the webhook was received."
echo "You can view logs in the Render dashboard for your web service." 