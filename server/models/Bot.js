const mongoose = require('mongoose');

const BotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  token: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bot', BotSchema);
