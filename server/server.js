require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const botRoutes = require('./routes/bots');
const destinationRoutes = require('./routes/destinations');
const messageRoutes = require('./routes/messages');
const telegramRoutes = require('./routes/telegram');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// API Routes
app.use('/api/bots', botRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/telegram', telegramRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'telegram-composer.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
