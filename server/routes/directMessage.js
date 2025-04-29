const express = require('express');
const router = express.Router();
const axios = require('axios');
const Bot = require('../models/Bot');
const AuthorizedUser = require('../models/AuthorizedUser');
const Destination = require('../models/Destination');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Function to transform Twitter/X links to fxtwitter.com
function transformTwitterLinks(text) {
  if (!text) return text;

  // Regular expression to match Twitter/X links
  // This matches both twitter.com and x.com URLs with various path patterns
  const twitterRegex = /(https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s]+)/gi;

  // Replace all matches with fxtwitter.com
  const transformedText = text.replace(twitterRegex, (match) => {
    try {
      // Extract the URL and replace the domain
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

// Direct message forwarding endpoint
router.post('/send', async (req, res) => {
  try {
    const { username, text } = req.body;

    // Validate required fields
    if (!username || !text) {
      return res.status(400).json({
        success: false,
        message: 'Username and text are required'
      });
    }

    // Get the default bot
    const bot = await Bot.findOne({ isDefault: true });
    if (!bot || !bot.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Default bot not found or inactive'
      });
    }

    // Check if the user is authorized for this bot
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    const authorizedUser = await AuthorizedUser.findOne({
      username: cleanUsername,
      botId: bot._id,
      isActive: true
    });

    if (!authorizedUser) {
      return res.status(403).json({
        success: false,
        message: `User @${cleanUsername} is not authorized for this bot`
      });
    }

    // Get the default destination for this bot
    const destination = await Destination.findOne({
      botId: bot._id,
      isDefault: true
    });

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'No default destination configured for this bot'
      });
    }

    // Transform any Twitter/X links in the message
    const originalText = text;
    const transformedText = transformTwitterLinks(originalText);

    // Log if links were transformed
    if (originalText !== transformedText) {
      console.log('Twitter/X links detected and transformed in direct message');
      console.log(`Original text: ${originalText}`);
      console.log(`Transformed text: ${transformedText}`);
    }

    // Send the message
    const baseUrl = `https://api.telegram.org/bot${bot.token}`;
    const response = await axios.post(`${baseUrl}/sendMessage`, {
      chat_id: destination.groupId,
      ...(destination.topicId && { message_thread_id: destination.topicId }),
      text: transformedText
    });

    if (!response.data.ok) {
      throw new Error(`Failed to send message: ${response.data.description}`);
    }

    res.json({
      success: true,
      message: `Message from @${cleanUsername} forwarded successfully`,
      destination: {
        groupId: destination.groupId,
        groupLabel: destination.groupLabel,
        topicId: destination.topicId,
        topicLabel: destination.topicLabel
      }
    });
  } catch (error) {
    console.error('Direct message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to forward message'
    });
  }
});

// Check if a user is authorized
router.get('/check/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Get the default bot
    const bot = await Bot.findOne({ isDefault: true });
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Default bot not found'
      });
    }

    // Check if the user is authorized for this bot
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    const authorizedUser = await AuthorizedUser.findOne({
      username: cleanUsername,
      botId: bot._id,
      isActive: true
    });

    if (!authorizedUser) {
      return res.json({
        success: false,
        authorized: false,
        message: `User @${cleanUsername} is not authorized for this bot`
      });
    }

    res.json({
      success: true,
      authorized: true,
      message: `User @${cleanUsername} is authorized for this bot`,
      user: authorizedUser
    });
  } catch (error) {
    console.error('Error checking authorization:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check authorization'
    });
  }
});

module.exports = router;
