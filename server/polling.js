const axios = require('axios');
const Bot = require('./models/Bot');
const AuthorizedUser = require('./models/AuthorizedUser');
const Destination = require('./models/Destination');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Store the last update ID for each bot to avoid processing the same updates multiple times
const lastUpdateIds = {};

// Function to forward a message to a destination
async function forwardMessage(message, destination) {
  try {
    // Base URL for Telegram Bot API
    const baseUrl = `https://api.telegram.org/bot${destination.botId.token}`;

    // Prepare message parameters
    const messageParams = {
      chat_id: destination.groupId,
      ...(destination.topicId && { message_thread_id: destination.topicId }),
    };

    // Handle different types of messages
    if (message.photo || message.video || message.document || message.animation) {
      // Handle media messages
      let fileId, caption, mediaType;

      if (message.photo) {
        // For photos, get the largest size
        fileId = message.photo[message.photo.length - 1].file_id;
        caption = message.caption || '';
        mediaType = 'photo';
      } else if (message.video) {
        fileId = message.video.file_id;
        caption = message.caption || '';
        mediaType = 'video';
      } else if (message.animation) {
        fileId = message.animation.file_id;
        caption = message.caption || '';
        mediaType = 'animation';
      } else if (message.document) {
        fileId = message.document.file_id;
        caption = message.caption || '';
        mediaType = 'document';
      }

      // Get file path
      const fileResponse = await axios.get(`${baseUrl}/getFile`, {
        params: { file_id: fileId }
      });

      if (!fileResponse.data.ok) {
        throw new Error(`Failed to get file: ${fileResponse.data.description}`);
      }

      const filePath = fileResponse.data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${destination.botId.token}/${filePath}`;

      // Download the file
      const fileData = await axios.get(fileUrl, { responseType: 'arraybuffer' });

      // Save to temp file
      const tempDir = os.tmpdir();
      const fileName = `telegram_media_${Date.now()}_${path.basename(filePath)}`;
      const tempFilePath = path.join(tempDir, fileName);

      fs.writeFileSync(tempFilePath, Buffer.from(fileData.data));

      // Create form data
      const formData = new FormData();

      // Add all parameters
      Object.entries(messageParams).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Add caption if provided
      if (caption) {
        formData.append('caption', caption);
      }

      // Add the media file
      formData.append(mediaType, fs.createReadStream(tempFilePath));

      // Send the appropriate media message
      const endpoint = `send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;
      const response = await axios.post(`${baseUrl}/${endpoint}`, formData, {
        headers: formData.getHeaders()
      });

      // Clean up the temp file
      fs.unlinkSync(tempFilePath);

      if (!response.data.ok) {
        throw new Error(`Failed to send media: ${response.data.description}`);
      }

      console.log(`Media message forwarded from @${message.from.username} to ${destination.groupLabel}`);
    } else if (message.text) {
      // Handle text messages
      const response = await axios.post(`${baseUrl}/sendMessage`, {
        ...messageParams,
        text: message.text,
      });

      if (!response.data.ok) {
        throw new Error(`Failed to send message: ${response.data.description}`);
      }

      console.log(`Text message forwarded from @${message.from.username} to ${destination.groupLabel}`);
    }
  } catch (error) {
    console.error('Error forwarding message:', error);
    throw error;
  }
}

// Function to process updates for a bot
async function processUpdates(bot) {
  try {
    // Get the last update ID for this bot, or start from 0
    const offset = lastUpdateIds[bot._id] ? lastUpdateIds[bot._id] + 1 : 0;

    // Base URL for Telegram Bot API
    const baseUrl = `https://api.telegram.org/bot${bot.token}`;

    // First, delete any webhook that might be set
    try {
      await axios.post(`${baseUrl}/deleteWebhook`);
      console.log('Deleted any existing webhook');
    } catch (error) {
      console.error('Error deleting webhook:', error.message);
    }

    // Get updates from Telegram with a shorter timeout to avoid conflicts
    try {
      const response = await axios.get(`${baseUrl}/getUpdates`, {
        params: {
          offset,
          timeout: 1, // Very short timeout to avoid conflicts
          allowed_updates: ['message'] // Only get message updates
        }
      });

      if (!response.data.ok) {
        throw new Error(`Failed to get updates: ${response.data.description}`);
      }

      const updates = response.data.result;

      if (updates.length > 0) {
        console.log(`Received ${updates.length} updates for bot ${bot.name}`);

        // Update the last update ID
        lastUpdateIds[bot._id] = updates[updates.length - 1].update_id;

        // Process each update
        for (const update of updates) {
          // Check if this is a message
          if (!update.message) {
            console.log('Update does not contain a message, ignoring');
            continue;
          }

          const message = update.message;

          // Check if the message has a from field and username
          if (!message.from || !message.from.username) {
            console.log('Message does not have a valid sender username, ignoring');
            continue;
          }

          const fromUsername = message.from.username;
          console.log(`Received message from @${fromUsername}`);

          // Check if the user is authorized for this bot
          const authorizedUser = await AuthorizedUser.findOne({
            username: fromUsername,
            botId: bot._id,
            isActive: true
          });

          if (!authorizedUser) {
            console.log(`Unauthorized message from @${fromUsername} for bot ${bot.name}, ignoring`);
            continue;
          }

          console.log(`Authorized user @${fromUsername} found for bot ${bot.name}, proceeding with forwarding`);

          // Get the default destination for this bot
          const destination = await Destination.findOne({
            botId: bot._id,
            isDefault: true
          }).populate('botId', 'token');

          if (!destination) {
            console.log(`No default destination found for bot ${bot.name}, ignoring`);
            continue;
          }

          // Forward the message to the destination
          await forwardMessage(message, destination);
        }
      }
    } catch (error) {
      // Handle 409 Conflict errors gracefully
      if (error.response && error.response.status === 409) {
        console.log(`Conflict detected for bot ${bot.name}, another instance is running. Will retry later.`);
      } else {
        console.error(`Error getting updates for bot ${bot.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`Error in processUpdates for bot ${bot.name}:`, error.message);
  }
}

// Main polling function
async function startPolling() {
  try {
    // Get all active bots except Father Time (which is handled by father-time-forwarder)
    const bots = await Bot.find({
      isActive: true,
      name: { $ne: 'Father Time' } // Exclude Father Time bot
    });

    if (bots.length === 0) {
      console.log('No active bots found (excluding Father Time)');
      return;
    }

    console.log(`Starting polling for ${bots.length} bots (excluding Father Time)`);

    // Process updates for each bot
    for (const bot of bots) {
      await processUpdates(bot);
    }
  } catch (error) {
    console.error('Error in polling:', error.message);
  } finally {
    // Schedule the next polling cycle with a longer interval
    // This helps avoid conflicts with other instances and reduces server load
    setTimeout(startPolling, 10000); // Poll every 10 seconds
  }
}

module.exports = { startPolling };
