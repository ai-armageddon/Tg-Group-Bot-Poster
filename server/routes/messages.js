const express = require('express');
const router = express.Router();
const axios = require('axios');
const Bot = require('../models/Bot');
const Destination = require('../models/Destination');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Send a message to Telegram
router.post('/send', async (req, res) => {
  try {
    const { botId, text, chatId, topicId, mediaType, mediaBase64 } = req.body;

    // Get bot
    let bot;

    if (botId) {
      bot = await Bot.findById(botId);
    } else {
      bot = await Bot.findOne({ isDefault: true });
    }

    if (!bot) {
      return res.status(400).json({ success: false, message: 'Bot not found' });
    }

    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID is required' });
    }

    // Base URL for Telegram Bot API
    const baseUrl = `https://api.telegram.org/bot${bot.token}`;

    // Prepare message parameters
    const messageParams = {
      chat_id: chatId,
      ...(topicId && { message_thread_id: topicId }),
    };

    let response;

    // Handle different types of messages
    if (mediaBase64 && mediaType) {
      // For media messages
      // Convert base64 to file
      const tempDir = os.tmpdir();
      const fileExt = mediaType === 'photo' ? '.jpg' : '.mp4';
      const fileName = `telegram_media_${Date.now()}${fileExt}`;
      const filePath = path.join(tempDir, fileName);

      try {
        // Remove the base64 prefix (e.g., "data:image/jpeg;base64,")
        let base64Data = mediaBase64;

        // Check if the base64 string has a data URI prefix
        if (base64Data.includes('base64,')) {
          base64Data = base64Data.split('base64,')[1];
        }

        // Write the file
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        // Verify the file was created and has content
        const fileStats = fs.statSync(filePath);
        console.log(`File created: ${filePath}, size: ${fileStats.size} bytes`);

        if (fileStats.size === 0) {
          throw new Error('Created file is empty');
        }
      } catch (error) {
        console.error('Error processing media file:', error);
        throw new Error(`Failed to process media: ${error.message}`);
      }

      // Create form data
      const formData = new FormData();

      // Add all parameters
      Object.entries(messageParams).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Add caption if text is provided
      if (text) {
        formData.append('caption', text);
      }

      // Add the media file
      formData.append(
        mediaType === 'photo' ? 'photo' : 'video',
        fs.createReadStream(filePath)
      );

      // Send the appropriate media message
      const endpoint = mediaType === 'photo' ? 'sendPhoto' : 'sendVideo';
      response = await axios.post(`${baseUrl}/${endpoint}`, formData, {
        headers: formData.getHeaders()
      });

      // Clean up the temp file
      fs.unlinkSync(filePath);
    } else {
      // For text-only messages
      if (!text || text.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Message text is required for text messages'
        });
      }

      // Send text message
      response = await axios.post(`${baseUrl}/sendMessage`, {
        ...messageParams,
        text,
      });
    }

    if (response.data.ok) {
      return res.json({
        success: true,
        message: 'Message sent successfully',
        data: response.data.result,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Failed to send message: ${response.data.description}`,
      });
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);

    // Provide more detailed error messages
    let errorMessage = 'Internal server error';

    if (error.response?.data?.description) {
      errorMessage = error.response.data.description;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Log additional details for debugging
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

module.exports = router;
