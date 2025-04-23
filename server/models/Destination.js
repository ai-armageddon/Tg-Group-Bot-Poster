const mongoose = require('mongoose');

const DestinationSchema = new mongoose.Schema({
  botId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bot',
    required: true
  },
  groupId: {
    type: String,
    required: true,
    trim: true
  },
  groupLabel: {
    type: String,
    default: 'My Telegram Group',
    trim: true
  },
  topicId: {
    type: String,
    trim: true
  },
  topicLabel: {
    type: String,
    default: '',
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Destination', DestinationSchema);
