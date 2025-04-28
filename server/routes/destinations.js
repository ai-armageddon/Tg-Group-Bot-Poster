const express = require('express');
const router = express.Router();
const Destination = require('../models/Destination');

// Get all destinations
router.get('/', async (req, res) => {
  try {
    const destinations = await Destination.find()
      .populate('botId', 'name token')
      .sort({ isDefault: -1, createdAt: -1 });
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get destinations by bot ID
router.get('/bot/:botId', async (req, res) => {
  try {
    const destinations = await Destination.find({ botId: req.params.botId })
      .sort({ groupLabel: 1, topicLabel: 1 });
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get default destination
router.get('/default', async (req, res) => {
  try {
    let defaultDestination = await Destination.findOne({ isDefault: true })
      .populate('botId', 'name token');

    // If no default destination exists, we need to create one with a default bot
    if (!defaultDestination) {
      // First, get the default bot
      const Bot = require('../models/Bot');
      let defaultBot = await Bot.findOne({ isDefault: true });

      // If no default bot exists, create one
      if (!defaultBot) {
        defaultBot = await Bot.create({
          name: 'Default Bot',
          token: process.env.TELEGRAM_BOT_TOKEN || 'your-bot-token',
          isActive: true,
          isDefault: true
        });
      }

      // Now create the default destination
      defaultDestination = await Destination.create({
        botId: defaultBot._id,
        groupId: process.env.CHAT_ID || 'your-chat-id',
        groupLabel: 'My Telegram Group',
        topicId: process.env.TOPIC_ID || 'your-topic-id',
        topicLabel: 'General',
        isDefault: true
      });

      // Populate the bot info
      defaultDestination = await Destination.findById(defaultDestination._id)
        .populate('botId', 'name token');
    }

    res.json(defaultDestination);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new destination
router.post('/', async (req, res) => {
  // Validate required fields
  if (!req.body.botId || !req.body.groupId) {
    return res.status(400).json({ message: 'Bot ID and Group ID are required' });
  }

  const destination = new Destination({
    botId: req.body.botId,
    groupId: req.body.groupId,
    groupLabel: req.body.groupLabel || 'Telegram Group',
    topicId: req.body.topicId || '',
    topicLabel: req.body.topicLabel || '',
    isDefault: req.body.isDefault || false
  });

  try {
    // If this is set as default, unset any existing default
    if (destination.isDefault) {
      await Destination.updateMany({ isDefault: true }, { isDefault: false });
    }

    const newDestination = await destination.save();

    // Populate the bot info for the response
    const populatedDestination = await Destination.findById(newDestination._id)
      .populate('botId', 'name token');

    res.status(201).json(populatedDestination);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a destination
router.put('/:id', async (req, res) => {
  try {
    // If this is being set as default, unset any existing default
    if (req.body.isDefault) {
      await Destination.updateMany({ isDefault: true }, { isDefault: false });
    }

    const updatedDestination = await Destination.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedDestination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    // Populate the bot info for the response
    const populatedDestination = await Destination.findById(updatedDestination._id)
      .populate('botId', 'name token');

    res.json(populatedDestination);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a destination
router.delete('/:id', async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);

    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    // Don't allow deleting the default destination
    if (destination.isDefault) {
      return res.status(400).json({ message: 'Cannot delete default destination' });
    }

    await destination.remove();
    res.json({ message: 'Destination deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
