require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const botRoutes = require('./routes/bots');
const destinationRoutes = require('./routes/destinations');
const messageRoutes = require('./routes/messages');
const telegramRoutes = require('./routes/telegram');
const authorizedUserRoutes = require('./routes/authorizedUsers');
const webhookRoutes = require('./routes/webhook');
const directMessageRoutes = require('./routes/directMessage');
const { startPolling } = require('./polling');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());

// Special handling for webhook routes to ensure raw body is available
app.use('/api/webhook', express.json({
  limit: '50mb',
  verify: (req, _, buf) => {
    // Store the raw request body for webhook verification if needed
    req.rawBody = buf.toString();
  }
}));

// Regular JSON parsing for other routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB with improved options
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
  connectTimeoutMS: 30000, // Increase connection timeout to 30 seconds
  heartbeatFrequencyMS: 10000, // Heartbeat every 10 seconds
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Add connection error handler
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Add disconnection handler
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
  setTimeout(() => {
    mongoose.connect(process.env.MONGODB_URI).catch(err => {
      console.error('Error reconnecting to MongoDB:', err);
    });
  }, 5000); // Wait 5 seconds before reconnecting
});

// Add successful reconnection handler
mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully');
});

// API Routes
app.use('/api/bots', botRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/authorized-users', authorizedUserRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/direct-message', directMessageRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../')));

  app.get('*', (_, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'telegram-composer.html'));
  });
} else {
  // Serve static files in development
  app.use(express.static(path.join(__dirname, '../')));

  // Route for direct message sender
  app.get('/direct-message', (_, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'direct-message.html'));
  });
}

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start polling for messages from authorized users
  console.log('Starting message polling...');
  startPolling();

  // Direct message API is also available
  console.log('Direct message API is available at /api/direct-message/send');
});
