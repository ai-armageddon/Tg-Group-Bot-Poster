# Telegram Post Composer

A simple, clean, and modern UI for composing and sending posts to Telegram groups using your bot.

## Features

- Compose text messages with formatting
- Upload and preview images and videos
- Manage multiple bots
- Edit bot credentials
- Configure destination group and topic IDs
- Save all settings to MongoDB

## Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd telegram-post-composer
   ```

2. Install server dependencies:
   ```
   cd server
   npm install
   ```

3. Configure your environment:
   - Copy `server/.env.sample` to `server/.env`
   - Edit the `.env` file to set your MongoDB connection string and Telegram credentials:
     ```
     MONGODB_URI=mongodb://localhost:27017/TgServices
     PORT=3001
     TELEGRAM_BOT_TOKEN=your-bot-token-here
     CHAT_ID=your-chat-id-here
     TOPIC_ID=your-topic-id-here
     ```
   - If you're using MongoDB Atlas, replace the connection string with your Atlas URI
   - Copy `Tg-creds.sample.txt` to `Tg-creds.txt` and add your Telegram credentials

4. Start the server:
   ```
   npm start
   ```

5. Open the application:
   - Open `telegram-composer.html` in your browser

## Usage

### Managing Bots

1. **Default Bot**: The application comes with a default bot using your credentials
   - Click "Edit" to modify the default bot's name and token
   - Changes are saved to MongoDB

2. **Adding Bots**: Click "Add New Bot" to add additional bots
   - Enter a name and token for the new bot
   - The bot will be saved to MongoDB

3. **Bot Status**: Toggle bots between active and inactive states
   - Inactive bots cannot be selected for sending messages

### Composing Posts

1. Write your message in the text area
2. Add media (optional):
   - Click "Add Media" to upload an image or video
   - Preview your media in the composer and preview panels
   - Remove media by clicking the "×" button

### Configuring Destination

1. Click "Edit" in the Destination section
2. Enter your Group ID and Topic ID
3. Click "Save Changes" to update the destination

### Sending Posts

Click "Send Post" to send your message to the selected Telegram group/topic using the selected bot.

## Database Structure

The application uses MongoDB with two collections:

1. **Bots**:
   - `name`: Bot name
   - `token`: Bot token
   - `isActive`: Whether the bot is active
   - `isDefault`: Whether this is the default bot

2. **Destinations**:
   - `groupId`: Telegram group/chat ID
   - `topicId`: Telegram topic ID (optional)
   - `name`: Destination name
   - `isDefault`: Whether this is the default destination

## Security

This application uses environment variables for sensitive information. Make sure to:
- Never commit your `.env` file or `Tg-creds.txt` to Git (they are included in .gitignore)
- Keep your Telegram bot token secure
- Use the provided sample files as templates
- Revoke and regenerate your bot token if you suspect it has been compromised

## Troubleshooting

- If the MongoDB connection fails, the application will fall back to local storage
- Check the browser console for error messages
- Ensure MongoDB is running and accessible
- Verify that the server is running on port 3001 (or update the API_URL in the HTML file)
