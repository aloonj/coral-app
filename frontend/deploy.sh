#!/bin/bash

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if we're in the frontend directory
if [[ "$(basename "$SCRIPT_DIR")" == "frontend" ]]; then
    # We're already in the frontend directory
    cd "$SCRIPT_DIR"
else
    # We're in the parent directory, need to cd into frontend
    if [[ -d "$SCRIPT_DIR/frontend" ]]; then
        cd "$SCRIPT_DIR/frontend"
    else
        echo "Error: Cannot find frontend directory. Please run this script from the project root or frontend directory."
        exit 1
    fi
fi

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
if [ -z "$1" ]; then
    echo "Error: No environment specified. Please specify 'production' or 'development'."
    echo "Usage: ./deploy.sh [production|development]"
    exit 1
fi

ENV=$1
echo "Deploying for environment: $ENV"

# Validate environment parameter
if [ "$ENV" != "production" ] && [ "$ENV" != "development" ]; then
    echo "Error: Invalid environment '$ENV'. Please specify 'production' or 'development'."
    echo "Usage: ./deploy.sh [production|development]"
    exit 1
fi

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

# Load environment variables from .env file to pass to PM2
echo "Loading environment variables from .env file..."
ENV_VARS=""
if [ -f .env ]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        if [[ ! "$line" =~ ^# && -n "$line" ]]; then
            # Extract variable name and value
            if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                VAR_NAME="${BASH_REMATCH[1]}"
                VAR_VALUE="${BASH_REMATCH[2]}"
                # Remove quotes if present
                VAR_VALUE="${VAR_VALUE%\"}"
                VAR_VALUE="${VAR_VALUE#\"}"
                VAR_VALUE="${VAR_VALUE%\'}"
                VAR_VALUE="${VAR_VALUE#\'}"
                # Add to environment variables string
                ENV_VARS="$ENV_VARS --env $VAR_NAME=\"$VAR_VALUE\""
            fi
        fi
    done < .env
fi

if pm2 list | grep -q "$APP_NAME"; then
    echo "Restarting existing PM2 process: $APP_NAME"
    # Use eval to properly handle the environment variables
    eval "pm2 restart ecosystem.config.cjs --only $APP_NAME --env $ENV $ENV_VARS"
else
    echo "Starting new PM2 process: $APP_NAME"
    # Use eval to properly handle the environment variables
    eval "pm2 start ecosystem.config.cjs --only $APP_NAME --env $ENV $ENV_VARS"
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
