const express = require('express');
const router = express.Router();
const AuthorizedUser = require('../models/AuthorizedUser');
const Bot = require('../models/Bot');

// Get all authorized users for a specific bot
router.get('/bot/:botId', async (req, res) => {
  try {
    const users = await AuthorizedUser.find({ botId: req.params.botId })
      .populate('botId', 'name token')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all authorized users
router.get('/', async (req, res) => {
  try {
    const users = await AuthorizedUser.find()
      .populate('botId', 'name token')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific authorized user
router.get('/:id', async (req, res) => {
  try {
    const user = await AuthorizedUser.findById(req.params.id)
      .populate('botId', 'name token');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new authorized user
router.post('/', async (req, res) => {
  try {
    // Check if bot exists
    const bot = await Bot.findById(req.body.botId);
    if (!bot) {
      return res.status(400).json({ message: 'Bot not found' });
    }

    // Check if username already exists for this bot
    const existingUser = await AuthorizedUser.findOne({
      username: req.body.username,
      botId: req.body.botId
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists for this bot' });
    }

    const user = new AuthorizedUser({
      username: req.body.username,
      label: req.body.label || '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      botId: req.body.botId
    });

    const newUser = await user.save();

    // Populate bot info for response
    const populatedUser = await AuthorizedUser.findById(newUser._id)
      .populate('botId', 'name token');

    res.status(201).json(populatedUser);
  } catch (err) {
    console.error('Error creating authorized user:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update an authorized user
router.put('/:id', async (req, res) => {
  try {
    // If changing bot, check if it exists
    if (req.body.botId) {
      const bot = await Bot.findById(req.body.botId);
      if (!bot) {
        return res.status(400).json({ message: 'Bot not found' });
      }
    }

    // Get the current user to check for username/bot conflicts
    const currentUser = await AuthorizedUser.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If changing username or bot, check for conflicts
    if (req.body.username || req.body.botId) {
      const botId = req.body.botId || currentUser.botId;
      const username = req.body.username || currentUser.username;

      const existingUser = await AuthorizedUser.findOne({
        username: username,
        botId: botId,
        _id: { $ne: req.params.id }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists for this bot' });
      }
    }

    const updatedUser = await AuthorizedUser.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('botId', 'name token');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an authorized user
router.delete('/:id', async (req, res) => {
  try {
    const user = await AuthorizedUser.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await AuthorizedUser.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
