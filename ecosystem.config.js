module.exports = {
  apps: [
    {
      name: 'telegram-bot-server',
      script: 'server/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/output.log',
      merge_logs: true
    },
    // Disabled since we're only using the Father Time bot
    // {
    //   name: 'telegram-message-forwarder',
    //   script: 'simple-forward.js',
    //   instances: 1,
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: '500M',
    //   cron_restart: '*/5 * * * *', // Restart every 5 minutes to avoid long-running conflicts
    //   env: {
    //     NODE_ENV: 'production'
    //   },
    //   log_date_format: 'YYYY-MM-DD HH:mm:ss',
    //   error_file: 'logs/forwarder-error.log',
    //   out_file: 'logs/forwarder-output.log',
    //   merge_logs: true
    // },
    {
      name: 'father-time-forwarder',
      script: 'father-time-forward.js',
      instances: 1,
      autorestart: false,
      watch: false,
      max_memory_restart: '500M',
      cron_restart: '*/1 * * * *', // Run every minute
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/father-time-error.log',
      out_file: 'logs/father-time-output.log',
      merge_logs: true
    }
  ]
};
