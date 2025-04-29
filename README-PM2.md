# Telegram Bot PM2 Setup

This guide explains how to manage your Telegram bot applications using PM2, a process manager for Node.js applications.

## What is PM2?

PM2 is a production process manager for Node.js applications that allows you to:
- Keep applications alive forever
- Reload them without downtime
- Facilitate common system admin tasks
- Manage application logging

## Getting Started

The following scripts are available to manage your Telegram bot applications:

### Starting the Applications

```bash
./start-pm2.sh
```

This script will:
1. Stop any existing PM2 processes for this project
2. Start the applications using the PM2 configuration
3. Display the status of the PM2 processes

### Checking the Status

```bash
./check-status.sh
```

This script will:
1. Display the status of the PM2 processes
2. Show the last 10 lines of logs for each application

### Stopping the Applications

```bash
./stop-pm2.sh
```

This script will stop the PM2 processes.

## PM2 Configuration

The PM2 configuration is defined in `ecosystem.config.js` and includes:

1. **telegram-bot-server**: The main server application that provides the API and web interface.
2. **telegram-message-forwarder**: A script that periodically checks for new messages and forwards them.

## Accessing the Applications

- **Web Interface**: http://localhost:3001/direct-message
- **API Endpoint**: http://localhost:3001/api/direct-message/send

## Viewing Logs

You can view the logs using the following commands:

```bash
# View all logs
pm2 logs

# View logs for a specific application
pm2 logs telegram-bot-server
pm2 logs telegram-message-forwarder

# View only error logs
pm2 logs telegram-bot-server --err
pm2 logs telegram-message-forwarder --err
```

## Common PM2 Commands

```bash
# List all processes
pm2 list

# Restart a process
pm2 restart telegram-bot-server
pm2 restart telegram-message-forwarder

# Stop a process
pm2 stop telegram-bot-server
pm2 stop telegram-message-forwarder

# Delete a process
pm2 delete telegram-bot-server
pm2 delete telegram-message-forwarder

# Monitor processes
pm2 monit

# Show process details
pm2 show telegram-bot-server
pm2 show telegram-message-forwarder
```

## Troubleshooting

If you encounter any issues:

1. **Check the logs**: `pm2 logs` to see what's happening
2. **Restart the processes**: `pm2 restart all` to restart all processes
3. **Delete and start again**: Run `./stop-pm2.sh` followed by `./start-pm2.sh`

## Note on Telegram API Conflicts

You may see "Conflict detected" messages in the logs. This is normal and happens because Telegram only allows one active connection to the `getUpdates` method per bot token at a time. Our applications are designed to handle these conflicts gracefully.

The direct message API will always work regardless of these conflicts, so you can reliably use the web interface or API to send messages.
