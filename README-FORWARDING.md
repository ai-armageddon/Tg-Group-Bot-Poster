# Telegram Message Forwarding

This solution allows authorized users to send messages to your Telegram bot, which will then be automatically forwarded to a specified group/topic.

## Features

- Authorized users can send messages to your bot
- Messages are automatically forwarded to your group/topic
- Twitter/X links are automatically converted to fxtwitter.com for better previews
- No webhook required
- Handles conflicts with other instances gracefully
- Simple to set up and use

## Setup

1. **Configure the bot**:
   - Edit `simple-forward.js` to set your bot token, group ID, topic ID, and authorized users
   - Or set the following environment variables:
     - `BOT_TOKEN`: Your Telegram bot token
     - `GROUP_ID`: Your destination group ID
     - `TOPIC_ID`: Your destination topic ID (optional)

2. **Run the script manually**:
   ```
   node simple-forward.js
   ```

3. **Set up automatic checking**:
   - Use the provided shell script:
     ```
     ./check-and-forward.sh
     ```
   - Set up a cron job to run the script periodically:
     ```
     # Run every minute
     * * * * * /path/to/check-and-forward.sh >> /path/to/forward.log 2>&1
     ```

## How It Works

1. The script checks for new messages sent to your bot
2. If a message is from an authorized user, it processes the message:
   - Checks for Twitter/X links and converts them to fxtwitter.com
   - This improves how links appear when shared in Telegram
3. The processed message is forwarded to your group/topic
4. The script handles conflicts with other instances gracefully
5. The last processed update ID is saved to avoid processing the same message twice

## Troubleshooting

- **Conflict errors**: The script is designed to handle conflicts with other instances. If you see "Conflict detected" messages, this is normal and the script will try an alternative approach.
- **No messages being forwarded**: Make sure the authorized user's username is correct (without the @ symbol) and that they are sending messages to the correct bot.
- **Permission errors**: Make sure your bot is an admin in the group with the necessary permissions to post messages.

## Web Interface

You can also use the web interface to send messages as an authorized user:

1. Start the server:
   ```
   node server/server.js
   ```

2. Open the direct message sender:
   ```
   http://localhost:3001/direct-message
   ```

3. Enter the username and message, then click "Send Message"
