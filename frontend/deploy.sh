#!/bin/bash

# Exit on error
set -e

echo "Starting frontend deployment process..."

# Create necessary directories
echo "Creating directories..."
mkdir -p logs

# Set proper permissions
echo "Setting permissions..."
chmod 755 logs

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building the application..."
npm run build

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please update .env file with your configuration"
    exit 1
fi

# Start/restart PM2 application
echo "Starting application..."

# Check if environment is specified
ENV=${1:-production}
echo "Deploying for environment: $ENV"

if [ "$ENV" = "development" ]; then
    # Development environment
    APP_NAME="dev-coral-frontend"
    
    # Stop production app if it's running
    echo "Stopping any running production app..."
    pm2 stop coral-frontend 2>/dev/null || true
else
    # Production environment
    APP_NAME="coral-frontend"
    
    # Stop development app if it's running
    echo "Stopping any running development app..."
    pm2 stop dev-coral-frontend 2>/dev/null || true
fi

if pm2 list | grep -q "$APP_NAME"; then
    echo "Restarting existing PM2 process: $APP_NAME"
    pm2 restart $APP_NAME
else
    echo "Starting new PM2 process: $APP_NAME"
    pm2 start ecosystem.config.cjs --only $APP_NAME --env $ENV
fi

# Save PM2 process list
pm2 save

echo "Frontend deployment completed successfully!"
echo "
Next steps:
1. Make sure your .env file is properly configured
2. Verify Nginx configuration is set up (if using)
3. Check application logs with: pm2 logs $APP_NAME
4. Monitor application status with: pm2 monit
"
