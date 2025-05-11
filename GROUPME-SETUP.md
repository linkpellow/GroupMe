# GroupMe Integration Setup

This guide will help you set up a GroupMe bot for your Crokodial application.

## Prerequisites

1. A GroupMe account with API access
2. Your GroupMe API token
3. A GroupMe group where you are an admin
4. Your server running with the GroupMe callback route enabled

## Setup Steps

### 1. Get Your GroupMe API Token

1. Go to https://dev.groupme.com/
2. Log in with your GroupMe credentials
3. Find your access token on the dashboard

### 2. Get Your GroupMe Group ID

Run this command to list your groups and their IDs:

```bash
curl -s "https://api.groupme.com/v3/groups?token=YOUR_GROUPME_TOKEN" | jq
```

Look for the `id` field of the group where you want to add your bot.

### 3. Edit the GroupMe Test Script

Edit the `groupme-test.sh` file and replace:
- `YOUR_GROUPME_TOKEN` with your actual token
- `YOUR_GROUP_ID` with your actual group ID
- You can also change the bot name if desired

### 4. Create the Bot

Run the script:

```bash
./groupme-test.sh
```

If successful, you'll see a JSON response with your bot details, including a `bot_id`.

### 5. Test the Callback URL

To test if your webhook is working:

```bash
./test-callback.sh
```

Check your server logs to verify the webhook was received.

## Common Issues

### "Callback url contains a forbidden domain" Error

GroupMe may block certain domains, including free ngrok domains. If you receive this error, you have a few options:

1. **Upgrade to a paid ngrok plan** which provides custom domains
2. **Deploy your server to a hosting platform** like Render, Heroku, or Vercel
3. **Use a different tunneling service** that provides non-blocked domains

### "Group only admins can add bots" Error

Ensure you're an admin of the group where you're attempting to add the bot.

## Using Your Bot

Once your bot is created, you can send messages from your application to your GroupMe group using:

```bash
curl -d '{"text":"Hello from Crokodial!","bot_id":"YOUR_BOT_ID"}' -H "Content-Type: application/json" -X POST https://api.groupme.com/v3/bots/post
```

Replace `YOUR_BOT_ID` with the bot_id from the creation response. 