const express = require('express');
const router = express.Router();
const Bot = require('../models/Bot');

// Get all bots
router.get('/', async (req, res) => {
  try {
    const bots = await Bot.find().sort({ isDefault: -1, createdAt: -1 });
    res.json(bots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get default bot
router.get('/default', async (req, res) => {
  try {
    let defaultBot = await Bot.findOne({ isDefault: true });
    
    // If no default bot exists, create one with the initial values
    if (!defaultBot) {
      defaultBot = await Bot.create({
        name: 'Default Bot',
        token: 'your-bot-token-here',
        isActive: true,
        isDefault: true
      });
    }
    
    res.json(defaultBot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new bot
router.post('/', async (req, res) => {
  const bot = new Bot({
    name: req.body.name,
    token: req.body.token,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    isDefault: req.body.isDefault || false
  });

  try {
    // If this is set as default, unset any existing default
    if (bot.isDefault) {
      await Bot.updateMany({ isDefault: true }, { isDefault: false });
    }
    
    const newBot = await bot.save();
    res.status(201).json(newBot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a bot
router.put('/:id', async (req, res) => {
  try {
    // If this is being set as default, unset any existing default
    if (req.body.isDefault) {
      await Bot.updateMany({ isDefault: true }, { isDefault: false });
    }
    
    const updatedBot = await Bot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!updatedBot) {
      return res.status(404).json({ message: 'Bot not found' });
    }
    
    res.json(updatedBot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a bot
router.delete('/:id', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }
    
    // Don't allow deleting the default bot
    if (bot.isDefault) {
      return res.status(400).json({ message: 'Cannot delete default bot' });
    }
    
    await bot.remove();
    res.json({ message: 'Bot deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
