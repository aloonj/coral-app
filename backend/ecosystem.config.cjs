// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  apps: [
    // Production apps
    {
      name: 'coral-backend',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: 'localhost'
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
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
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: 'localhost'
      },
      error_file: 'logs/worker-err.log',
      out_file: 'logs/worker-out.log',
      log_file: 'logs/worker-combined.log',
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
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: 'localhost'
      },
      error_file: 'logs/backup-err.log',
      out_file: 'logs/backup-out.log',
      log_file: 'logs/backup-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    
    // Development apps
    {
      name: 'dev-coral-backend',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
        HOST: 'localhost'
      },
      error_file: 'logs/dev-err.log',
      out_file: 'logs/dev-out.log',
      log_file: 'logs/dev-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'dev-coral-notification-worker',
      script: 'src/workers/notificationWorker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
        HOST: 'localhost'
      },
      error_file: 'logs/dev-worker-err.log',
      out_file: 'logs/dev-worker-out.log',
      log_file: 'logs/dev-worker-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'dev-coral-backup-worker',
      script: 'src/workers/backupWorker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
        HOST: 'localhost'
      },
      error_file: 'logs/dev-backup-err.log',
      out_file: 'logs/dev-backup-out.log',
      log_file: 'logs/dev-backup-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
