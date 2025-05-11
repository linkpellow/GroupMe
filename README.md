# GroupMe Webhook Server

A simple Express server that receives and processes GroupMe webhooks for Crokodial.

## Features

- Listens for GroupMe message webhooks
- Logs incoming messages
- Can be easily deployed to Render

## Deployment to Render

1. Push this repository to GitHub
2. Sign up for a Render account at https://render.com
3. Create a new **Web Service**
4. Connect your GitHub repository
5. Use the following settings:
   - **Name**: groupme-webhook (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
6. Click "Create Web Service"

Once deployed, Render will provide you with a URL like `https://groupme-webhook.onrender.com`. Use this URL + `/groupme/callback` as your GroupMe bot's callback URL.

## Setting Up the Bot

1. Get your GroupMe API token from https://dev.groupme.com/
2. Find your GroupMe group ID:
   ```bash
   curl -s "https://api.groupme.com/v3/groups?token=YOUR_GROUPME_TOKEN" | jq
   ```
3. Create a bot with the Render URL:
   ```bash
   curl -s -X POST "https://api.groupme.com/v3/bots?token=YOUR_GROUPME_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"bot\":{\"name\":\"CrokodialBot\",\"group_id\":\"YOUR_GROUP_ID\",\"callback_url\":\"https://your-app.onrender.com/groupme/callback\"}}"
   ```

## Local Development

1. Install dependencies: `npm install`
2. Start the server: `npm run dev`
3. Use ngrok for local testing: `ngrok http 3000`

## Sending Messages

Once your bot is created, you can send messages with:

```bash
curl -s -X POST "https://api.groupme.com/v3/bots/post" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Hello from Crokodial!\",\"bot_id\":\"YOUR_BOT_ID\"}"
``` 