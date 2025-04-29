#!/bin/bash

# Stop the PM2 processes
pm2 delete telegram-bot-server telegram-message-forwarder father-time-forwarder

echo "Telegram bot applications have been stopped."
