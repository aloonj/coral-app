module.exports = {
  apps: [{
    name: 'coral-frontend',
    script: './node_modules/.bin/vite',
    args: 'preview --port 3000 --host localhost',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
