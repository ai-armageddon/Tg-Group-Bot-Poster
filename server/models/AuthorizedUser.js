const mongoose = require('mongoose');

const AuthorizedUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  label: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  botId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bot',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure username is unique per bot
AuthorizedUserSchema.index({ username: 1, botId: 1 }, { unique: true });

module.exports = mongoose.model('AuthorizedUser', AuthorizedUserSchema);
