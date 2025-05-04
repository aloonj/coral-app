// Load environment variables from .env file
require('dotenv').config();

// Determine environment-specific settings
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || (NODE_ENV === 'production' ? 5000 : 5001);
const FRONTEND_URL = process.env.FRONTEND_URL || 
  (NODE_ENV === 'production' ? 'https://fragglerock.shop' : 'https://dev.fragglerock.shop');

console.log('Starting with environment:', {
  NODE_ENV,
  PORT,
  FRONTEND_URL
});

module.exports = {
  apps: [
    {
      name: 'coral-backend',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV,
        PORT,
        HOST: process.env.HOST || 'localhost',
        FRONTEND_URL
      },
      error_file: `logs/${NODE_ENV}-err.log`,
      out_file: `logs/${NODE_ENV}-out.log`,
      log_file: `logs/${NODE_ENV}-combined.log`,
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'coral-notification-worker',
      script: 'src/workers/notificationWorker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV,
        PORT,
        HOST: process.env.HOST || 'localhost',
        FRONTEND_URL
      },
      error_file: `logs/${NODE_ENV}-worker-err.log`,
      out_file: `logs/${NODE_ENV}-worker-out.log`,
      log_file: `logs/${NODE_ENV}-worker-combined.log`,
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'coral-backup-worker',
      script: 'src/workers/backupWorker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV,
        PORT,
        HOST: process.env.HOST || 'localhost',
        FRONTEND_URL
      },
      error_file: `logs/${NODE_ENV}-backup-err.log`,
      out_file: `logs/${NODE_ENV}-backup-out.log`,
      log_file: `logs/${NODE_ENV}-backup-combined.log`,
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
