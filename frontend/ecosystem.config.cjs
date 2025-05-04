// Load environment variables from .env file
require('dotenv').config();

// Determine environment-specific settings
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_PORT = NODE_ENV === 'production' ? 3000 : 3000;
const API_PORT = NODE_ENV === 'production' ? 5000 : 5000;
const VITE_API_URL = process.env.VITE_API_URL || `http://localhost:${API_PORT}`;
const VITE_APP_TITLE = process.env.VITE_APP_TITLE || 
  (NODE_ENV === 'production' ? 'Coral Management System' : 'Coral Management System (Dev)');

console.log('Starting frontend with environment:', {
  NODE_ENV,
  FRONTEND_PORT,
  VITE_API_URL,
  VITE_APP_TITLE
});

module.exports = {
  apps: [
    {
      name: 'coral-frontend',
      script: './node_modules/.bin/vite',
      args: NODE_ENV === 'production' 
        ? `preview --port ${FRONTEND_PORT} --host localhost` 
        : `dev --port ${FRONTEND_PORT} --host localhost`,
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV,
        VITE_API_URL,
        VITE_APP_TITLE
      },
      error_file: `logs/${NODE_ENV}-err.log`,
      out_file: `logs/${NODE_ENV}-out.log`,
      log_file: `logs/${NODE_ENV}-combined.log`,
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
