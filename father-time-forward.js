const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const config = {
  // Bot token
  botToken: process.env.FATHER_TIME_BOT_TOKEN || 'YOUR_BOT_TOKEN',

  // Destination group ID
  groupId: process.env.GROUP_ID || 'YOUR_GROUP_ID',

  // Destination topic ID (optional)
  topicId: process.env.TOPIC_ID || 'YOUR_TOPIC_ID',

  // Authorized usernames (without @)
  authorizedUsers: process.env.AUTHORIZED_USERS ? process.env.AUTHORIZED_USERS.split(',') : ['username1', 'username2'],

  // Debug mode
  debug: process.env.DEBUG === 'true',

  // File to store the last update ID
  lastUpdateIdFile: path.join(__dirname, 'father_time_last_update_id.txt')
};

// Function to get the last update ID from file
function getLastUpdateId() {
  try {
    if (fs.existsSync(config.lastUpdateIdFile)) {
      const id = parseInt(fs.readFileSync(config.lastUpdateIdFile, 'utf8').trim(), 10);
      return isNaN(id) ? 0 : id;
    }
  } catch (error) {
    console.error('Error reading last update ID:', error.message);
  }
  return 0;
}

// Function to save the last update ID to file
function saveLastUpdateId(id) {
  try {
    fs.writeFileSync(config.lastUpdateIdFile, id.toString(), 'utf8');
    console.log(`Saved last update ID: ${id}`);
  } catch (error) {
    console.error('Error saving last update ID:', error.message);
  }
}

// Function to transform Twitter/X links to fxtwitter.com
function transformTwitterLinks(text) {
  if (!text) return text;

  // Regular expression to match Twitter/X links
  // This matches both twitter.com and x.com URLs with various path patterns
  const twitterRegex = /(https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s]+)/gi;

  // Replace all matches with fxtwitter.com
  const transformedText = text.replace(twitterRegex, (match) => {
    // Extract the URL and replace the domain
    try {
      const url = new URL(match);
      const newUrl = `https://fxtwitter.com${url.pathname}${url.search}${url.hash}`;
      console.log(`Transformed Twitter link: ${match} -> ${newUrl}`);
      return newUrl;
    } catch (error) {
      console.error(`Error transforming URL ${match}:`, error.message);
      return match; // Return original URL if there's an error
    }
  });

  return transformedText;
}

// Function to check if text contains Twitter/X links
function containsTwitterLinks(text) {
  if (!text) return false;
  const twitterRegex = /(https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s]+)/gi;
  return twitterRegex.test(text);
}

// Function to forward a message to the destination
async function forwardMessage(message) {
  try {
    // Base URL for Telegram Bot API
    const baseUrl = `https://api.telegram.org/bot${config.botToken}`;

    // Prepare message parameters
    const messageParams = {
      chat_id: config.groupId,
      ...(config.topicId && { message_thread_id: config.topicId }),
    };

    // Handle different types of messages
    if (message.text) {
      // Check if the message contains Twitter/X links
      const originalText = message.text;
      const hasTwitterLinks = containsTwitterLinks(originalText);

      if (hasTwitterLinks) {
        // Transform the Twitter/X links
        const transformedText = transformTwitterLinks(originalText);

        // Log the transformation
        console.log('Twitter/X links detected and transformed');
        debugLog(`Original text: ${originalText}`);
        debugLog(`Transformed text: ${transformedText}`);

        // Send only the transformed message
        const response = await axios.post(`${baseUrl}/sendMessage`, {
          ...messageParams,
          text: transformedText,
        });

        if (!response.data.ok) {
          throw new Error(`Failed to send message: ${response.data.description}`);
        }

        console.log(`Transformed message forwarded from @${message.from.username} to group`);
        return true;
      } else {
        // No Twitter/X links, forward the original message
        const response = await axios.post(`${baseUrl}/sendMessage`, {
          ...messageParams,
          text: originalText,
        });

        if (!response.data.ok) {
          throw new Error(`Failed to send message: ${response.data.description}`);
        }

        console.log(`Regular message forwarded from @${message.from.username} to group`);
        return true;
      }
    } else {
      console.log('Message type not supported for forwarding');
      return false;
    }
  } catch (error) {
    console.error('Error forwarding message:', error.message);
    return false;
  }
}

// Debug log function
function debugLog(message) {
  if (config.debug) {
    console.log(`[DEBUG] ${message}`);
  }
}

// Function to get updates from Telegram
async function getUpdates(baseUrl, lastUpdateId) {
  try {
    const response = await axios.get(`${baseUrl}/getUpdates`, {
      params: {
        offset: lastUpdateId + 1,
        limit: 100,
        timeout: 1, // Very short timeout to avoid conflicts
      }
    });

    if (!response.data.ok) {
      throw new Error(`Failed to get updates: ${response.data.description}`);
    }

    return response.data.result;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log('Conflict detected: Another instance is using getUpdates. Trying a different approach...');

      // Try to get the most recent messages directly
      try {
        // First, set a webhook to a non-existent URL to force Telegram to stop using getUpdates
        await axios.post(`${baseUrl}/setWebhook`, {
          url: 'https://example.com/non-existent-webhook'
        });

        // Then immediately delete it
        await axios.post(`${baseUrl}/deleteWebhook`);

        // Now try getUpdates again with a different offset
        const retryResponse = await axios.get(`${baseUrl}/getUpdates`, {
          params: {
            offset: -1, // Get the most recent update
            limit: 1
          }
        });

        if (retryResponse.data.ok && retryResponse.data.result.length > 0) {
          // Save this update ID for next time
          const newLastUpdateId = retryResponse.data.result[0].update_id;
          saveLastUpdateId(newLastUpdateId);

          // Mark this update as already handled
          retryResponse.data.result[0].handled = true;

          return retryResponse.data.result;
        }
      } catch (retryError) {
        console.error('Error in retry attempt:', retryError.message);
      }

      // If all else fails, return an empty array
      return [];
    }

    // For other errors, rethrow
    throw error;
  }
}

// Main function to check for and forward messages
async function checkAndForwardMessages() {
  try {
    console.log('Checking for new messages...');

    // Get the last update ID
    const lastUpdateId = getLastUpdateId();
    console.log(`Last update ID: ${lastUpdateId}`);

    debugLog(`Bot token: ${config.botToken}`);
    debugLog(`Group ID: ${config.groupId}`);
    debugLog(`Topic ID: ${config.topicId}`);
    debugLog(`Authorized users: ${config.authorizedUsers.join(', ')}`);

    // Base URL for Telegram Bot API
    const baseUrl = `https://api.telegram.org/bot${config.botToken}`;

    // Delete any webhook that might be set
    try {
      await axios.post(`${baseUrl}/deleteWebhook`);
      console.log('Deleted any existing webhook');
    } catch (error) {
      console.error('Error deleting webhook:', error.message);
    }

    // Get updates from Telegram
    const updates = await getUpdates(baseUrl, lastUpdateId);
    console.log(`Received ${updates.length} updates`);

    if (updates.length > 0) {
      // Update the last update ID (if not already done in getUpdates)
      if (updates.length > 1 || !updates[0].handled) {
        const newLastUpdateId = updates[updates.length - 1].update_id;
        saveLastUpdateId(newLastUpdateId);
      }

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

        // Check if this is a private chat (not a group message)
        // In Telegram, private chats have type 'private', while groups have type 'group' or 'supergroup'
        if (!message.chat || message.chat.type !== 'private') {
          console.log(`Skipping message from @${message.from.username} because it's not from a private chat (type: ${message.chat ? message.chat.type : 'unknown'})`);
          continue;
        }

        const fromUsername = message.from.username;
        console.log(`Received private message from @${fromUsername}: ${message.text || '[non-text content]'}`);

        // Check if the user is authorized
        debugLog(`Checking if user ${fromUsername} is in authorized list: ${config.authorizedUsers}`);
        if (!config.authorizedUsers.includes(fromUsername)) {
          console.log(`Unauthorized message from @${fromUsername}, ignoring`);
          continue;
        }

        console.log(`Authorized user @${fromUsername} found, proceeding with forwarding`);
        debugLog(`Message text: ${message.text}`);
        debugLog(`Forwarding to group ${config.groupId} topic ${config.topicId}`);

        // Forward the message to the destination
        await forwardMessage(message);
      }
    } else {
      console.log('No new messages');
    }
  } catch (error) {
    console.error('Error checking and forwarding messages:', error.message);
  }
}

// Run the script
checkAndForwardMessages();
