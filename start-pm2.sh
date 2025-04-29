#!/bin/bash

# Change to the project directory
cd "$(dirname "$0")"

# Stop any existing PM2 processes for this project
pm2 delete telegram-bot-server father-time-forwarder 2>/dev/null || true

# Start the applications using the PM2 configuration
pm2 start ecosystem.config.js

# Display the status of the PM2 processes
pm2 status

echo "Telegram bot applications are now running with PM2."
echo "To view logs, use: pm2 logs"
echo "To stop the applications, use: pm2 delete telegram-bot-server father-time-forwarder"
