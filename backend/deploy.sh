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

# Check if environment is specified
ENV=${1:-production}
echo "Deploying for environment: $ENV"

if [ "$ENV" = "development" ]; then
    # Development environment
    APP_NAMES=("dev-coral-backend" "dev-coral-notification-worker" "dev-coral-backup-worker")
    
    # Stop any production apps if they're running
    echo "Stopping any running production apps..."
    pm2 stop coral-backend coral-notification-worker coral-backup-worker 2>/dev/null || true
else
    # Production environment
    APP_NAMES=("coral-backend" "coral-notification-worker" "coral-backup-worker")
    
    # Stop any development apps if they're running
    echo "Stopping any running development apps..."
    pm2 stop dev-coral-backend dev-coral-notification-worker dev-coral-backup-worker 2>/dev/null || true
fi

# Start or restart the apps for the selected environment
for APP_NAME in "${APP_NAMES[@]}"; do
    if pm2 list | grep -q "$APP_NAME"; then
        echo "Restarting existing PM2 process: $APP_NAME"
        pm2 restart $APP_NAME
    else
        echo "Starting new PM2 process: $APP_NAME"
        pm2 start ecosystem.config.cjs --only $APP_NAME --env $ENV
    fi
done

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
