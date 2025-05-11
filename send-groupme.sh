#!/bin/bash

# Replace with your actual bot ID
BOT_ID="YOUR_BOT_ID"

# Check if a message was provided
if [ -z "$1" ]; then
  echo "Usage: ./send-groupme.sh \"Your message here\""
  exit 1
fi

# Check if bot ID is set
if [ "$BOT_ID" = "YOUR_BOT_ID" ]; then
  echo "Error: Please edit this script and replace YOUR_BOT_ID with your actual GroupMe bot ID"
  exit 1
fi

# Get the message from command line argument
MESSAGE="$1"

# Send the message
echo "Sending message to GroupMe: $MESSAGE"
curl -s -X POST "https://api.groupme.com/v3/bots/post" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$MESSAGE\",\"bot_id\":\"$BOT_ID\"}"

echo -e "\n\nMessage sent!" 