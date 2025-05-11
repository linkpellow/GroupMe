# Deploying GroupMe Webhook to Render

This guide walks you through the process of deploying your GroupMe webhook server to Render.

## Prerequisites

1. A GitHub account
2. The GroupMe webhook code pushed to your repository
3. A Render account (sign up at https://render.com - the free tier is sufficient)

## Step-by-Step Deployment Guide

### 1. Push Your Code to GitHub

Make sure all the files we created are in your GitHub repository:
- `groupme-webhook.js` (the Express server)
- `package.json` (with dependencies)
- `.gitignore`
- `README.md`

```bash
# If you haven't initialized the repo yet
git init
git add .
git commit -m "Initial commit for GroupMe webhook server"
git branch -M main
git remote add origin https://github.com/yourusername/GroupMe.git
git push -u origin main

# If you already have the repo initialized
git add .
git commit -m "Add GroupMe webhook server files"
git push
```

### 2. Create a New Web Service on Render

1. Log in to your Render account
2. Click on "New" in the top right corner
3. Select "Web Service" from the dropdown

### 3. Connect Your Repository

1. In the "Connect a repository" section, click on "Connect" next to GitHub
2. Grant Render access to your repositories if prompted
3. Find and select your GroupMe repository

### 4. Configure the Web Service

Enter the following configuration:
- **Name**: `groupme-webhook` (or any name you prefer)
- **Environment**: `Node`
- **Region**: Choose the region closest to you
- **Branch**: `main` (or whichever branch has your code)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free

### 5. Create Web Service

1. Click "Create Web Service"
2. Wait for Render to deploy your application (this may take a few minutes)

### 6. Get Your Webhook URL

1. Once deployed, Render will provide you with a URL (e.g., `https://groupme-webhook-abc123.onrender.com`)
2. Your full webhook URL is this URL plus the endpoint path: `https://groupme-webhook-abc123.onrender.com/groupme/callback`

### 7. Update Your Scripts

Update the following files with your new Render URL:
- `groupme-test.sh`
- `test-callback.sh`

### 8. Create Your GroupMe Bot

Run the updated script to create your bot with the Render URL:
```bash
./groupme-test.sh
```

### 9. Test the Webhook

Test if your webhook is working:
```bash
./test-callback.sh
```

Check the Render logs to verify the webhook was received:
1. Go to your dashboard on Render
2. Click on your web service
3. Click on "Logs" in the left navigation

### 10. Update Your Bot Message Script

Once your bot is created successfully, update the `send-groupme.sh` script with your bot_id and start sending messages:
```bash
./send-groupme.sh "Hello from Crokodial!"
```

## Troubleshooting

- **Deployment Failed**: Check the build logs on Render for specific errors
- **Bot Creation Failed**: Ensure your GroupMe token and group ID are correct
- **Webhook Not Received**: Make sure your Render service is running and the URL is correct
- **Bot Not Sending Messages**: Verify your bot_id is correct in the send-groupme.sh script 