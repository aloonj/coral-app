// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  apps: [
    // Production app
    {
      name: 'coral-frontend',
      script: './node_modules/.bin/vite',
      args: 'preview --port 3000 --host localhost',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        // Add any frontend-specific environment variables here
        VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:5000',
        VITE_APP_TITLE: process.env.VITE_APP_TITLE || 'Coral Management System'
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    
    // Development app
    {
      name: 'dev-coral-frontend',
      script: './node_modules/.bin/vite',
      args: 'dev --port 3001 --host localhost',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development',
        // Add any frontend-specific environment variables here
        VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:5001',
        VITE_APP_TITLE: process.env.VITE_APP_TITLE || 'Coral Management System (Dev)'
      },
      error_file: 'logs/dev-err.log',
      out_file: 'logs/dev-out.log',
      log_file: 'logs/dev-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
