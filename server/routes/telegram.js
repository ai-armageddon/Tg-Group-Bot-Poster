const express = require('express');
const router = express.Router();
const axios = require('axios');
const Bot = require('../models/Bot');

// Get available chats for a bot
router.get('/chats/:botId', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.botId);
    
    if (!bot) {
      return res.status(404).json({ success: false, message: 'Bot not found' });
    }
    
    // Base URL for Telegram Bot API
    const baseUrl = `https://api.telegram.org/bot${bot.token}`;
    
    // Get updates to find available chats
    const response = await axios.get(`${baseUrl}/getUpdates`);
    
    if (!response.data.ok) {
      return res.status(400).json({ 
        success: false, 
        message: `Telegram API error: ${response.data.description}` 
      });
    }
    
    // Extract unique chats from updates
    const updates = response.data.result;
    const chats = new Map();
    
    updates.forEach(update => {
      if (update.message && update.message.chat) {
        const chat = update.message.chat;
        if (!chats.has(chat.id)) {
          chats.set(chat.id, {
            id: chat.id,
            type: chat.type,
            title: chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim() || `Chat ${chat.id}`,
            topics: []
          });
        }
      }
      
      // Check for forum topics
      if (update.message && update.message.message_thread_id) {
        const chatId = update.message.chat.id;
        const topicId = update.message.message_thread_id;
        const chat = chats.get(chatId);
        
        if (chat && !chat.topics.some(t => t.id === topicId)) {
          chat.topics.push({
            id: topicId,
            name: `Topic ${topicId}` // Telegram API doesn't provide topic names directly
          });
        }
      }
    });
    
    res.json({
      success: true,
      chats: Array.from(chats.values())
    });
  } catch (error) {
    console.error('Error fetching Telegram chats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.description || 'Failed to fetch chats from Telegram' 
    });
  }
});

// Get chat info
router.get('/chat-info', async (req, res) => {
  try {
    const { botToken, chatId } = req.query;
    
    if (!botToken || !chatId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bot token and chat ID are required' 
      });
    }
    
    // Base URL for Telegram Bot API
    const baseUrl = `https://api.telegram.org/bot${botToken}`;
    
    // Get chat info
    const response = await axios.get(`${baseUrl}/getChat`, {
      params: { chat_id: chatId }
    });
    
    if (!response.data.ok) {
      return res.status(400).json({ 
        success: false, 
        message: `Telegram API error: ${response.data.description}` 
      });
    }
    
    const chat = response.data.result;
    
    // Check if the chat is a forum
    let topics = [];
    if (chat.is_forum) {
      try {
        // Try to get forum topics
        const topicsResponse = await axios.get(`${baseUrl}/getForumTopicsByChat`, {
          params: { chat_id: chatId }
        });
        
        if (topicsResponse.data.ok) {
          topics = topicsResponse.data.result.map(topic => ({
            id: topic.message_thread_id,
            name: topic.name
          }));
        }
      } catch (topicError) {
        console.log('Could not fetch forum topics:', topicError.message);
        // Continue without topics if this fails
      }
    }
    
    res.json({
      success: true,
      chat: {
        id: chat.id,
        type: chat.type,
        title: chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim(),
        is_forum: chat.is_forum || false,
        topics
      }
    });
  } catch (error) {
    console.error('Error fetching chat info:', error);
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.description || 'Failed to fetch chat info from Telegram' 
    });
  }
});

module.exports = router;
