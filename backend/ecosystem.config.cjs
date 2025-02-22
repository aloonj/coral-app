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
      NODE_ENV: 'production',
      PORT: 5000,
      HOST: 'localhost'
    },
    env_production: {
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
      env_production: {
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
      env_production: {
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
    }
  ]
};
