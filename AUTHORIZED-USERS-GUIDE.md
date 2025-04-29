# Telegram Bot Authorized Users Guide

This guide explains how to set up authorized users who can message your bot and have those messages automatically forwarded to your group.

## Prerequisites

1. Your Telegram bot token
2. The Telegram usernames of people you want to authorize

## Adding Authorized Users

1. Open the Telegram Post Composer application
2. Select a bot from the Bot Selection panel
3. Navigate to the "Authorized Users" section
4. Click "Add User"
5. Enter the Telegram username (without @)
6. Click "Add" to save

That's it! The user is now authorized to send messages to your bot, and those messages will be forwarded to the default destination configured for that bot.

## Optional: Setting Up a Webhook

If you want real-time message forwarding, you can set up a webhook. This requires a publicly accessible server with HTTPS.

### Option 1: Using the UI

1. Open the Telegram Post Composer application
2. Navigate to the "Webhook Setup" section
3. Enter your server URL (must be HTTPS)
4. Select the bot from the dropdown
5. Click "Set Webhook"
6. Check the status to verify it's working

### Option 2: Using the Telegram API Directly

If you prefer to set up the webhook manually:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-server.com/api/webhook/<YOUR_BOT_TOKEN>
```

Replace:
- `<YOUR_BOT_TOKEN>` with your actual bot token
- `https://your-server.com` with your server URL



## Testing

You can test both the authorized users and webhook functionality using the included test script:

### Testing Direct Message Forwarding (No Webhook Required)

```
node server/test-webhook.js direct <BOT_ID> <USERNAME> [MESSAGE]
```

Replace:
- `<BOT_ID>` with your bot's MongoDB ID (found in the database or from the browser developer tools)
- `<USERNAME>` with the Telegram username to simulate
- `[MESSAGE]` (optional) with a test message

### Testing Webhook Functionality

```
node server/test-webhook.js webhook <BOT_TOKEN> <USERNAME> [MESSAGE]
```

Replace:
- `<BOT_TOKEN>` with your bot token
- `<USERNAME>` with the Telegram username to simulate
- `[MESSAGE]` (optional) with a test message

## Troubleshooting

### Direct Message Forwarding Not Working

1. Verify the bot ID is correct
2. Check that the user is authorized in the system
3. Ensure the bot has a default destination configured
4. Check the server logs for errors

### Webhook Not Working

1. Verify your server is publicly accessible
2. Ensure you're using HTTPS (required by Telegram)
3. Check the server logs for errors
4. Verify the bot token is correct
5. Check that the user is authorized in the system

### User Not Authorized

1. Make sure the username is entered correctly (case-sensitive)
2. Check that the user is marked as "Active"
3. Verify the destination is configured correctly

## Security Considerations

- Keep your bot token secure
- Only authorize users you trust
- Consider implementing additional security measures for sensitive operations
- Regularly check the authorized users list and remove any that are no longer needed

## How It Works

### Without Webhook (Simpler Setup)

1. You add authorized users to your bot through the UI
2. The server stores these usernames in the database
3. When you test with the test script, it simulates a message from an authorized user
4. The server verifies the sender's username against the authorized users list
5. If authorized, the message is forwarded to the configured destination

### With Webhook (Real-time Forwarding)

1. Telegram sends updates to your webhook endpoint when your bot receives messages
2. The server verifies the sender's username against the authorized users list
3. If authorized, the message is forwarded to the configured destination
4. The original sender's username is logged for tracking purposes

Both methods allow trusted users to post content to your Telegram groups through your bot, without needing direct access to the group.
