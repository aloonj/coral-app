#!/bin/bash

# Exit on error
set -e

echo "Starting deployment process..."

# Create necessary directories
echo "Creating directories..."
mkdir -p logs
mkdir -p uploads

# Set proper permissions
echo "Setting permissions..."
chmod 755 logs
chmod 755 uploads

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please update .env file with your configuration"
    exit 1
fi

# Check if MySQL is running
echo "Checking MySQL status..."
if ! systemctl is-active --quiet mysql; then
    echo "MySQL is not running. Starting MySQL..."
    sudo systemctl start mysql
fi

# Initialize/update database
echo "Running database operations..."
node src/config/seeder.js

# Start/restart PM2 application
echo "Starting application..."
if pm2 list | grep -q "coral-backend"; then
    echo "Restarting existing PM2 process..."
    pm2 restart coral-backend
else
    echo "Starting new PM2 process..."
    pm2 start ecosystem.config.js
fi

# Save PM2 process list
pm2 save

echo "Deployment completed successfully!"
echo "
Next steps:
1. Make sure your .env file is properly configured
2. Verify Nginx configuration is set up
3. Check application logs with: pm2 logs coral-backend
4. Monitor application status with: pm2 monit
"
