#!/bin/bash

# Start MongoDB if it's not already running
echo "Starting MongoDB..."
mongod --dbpath=/data/db &

# Wait for MongoDB to start
sleep 2

# Navigate to the server directory
cd server

# Install dependencies if needed
echo "Installing dependencies..."
npm install

# Start the server
echo "Starting server..."
node server.js
