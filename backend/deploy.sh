#!/bin/bash

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if we're in the backend directory
if [[ "$(basename "$SCRIPT_DIR")" == "backend" ]]; then
    # We're already in the backend directory
    cd "$SCRIPT_DIR"
else
    # We're in the parent directory, need to cd into backend
    if [[ -d "$SCRIPT_DIR/backend" ]]; then
        cd "$SCRIPT_DIR/backend"
    else
        echo "Error: Cannot find backend directory. Please run this script from the project root or backend directory."
        exit 1
    fi
fi

echo "Starting deployment process..."

# Create necessary directories
echo "Creating directories..."
mkdir -p logs
mkdir -p uploads

# Set proper permissions
echo "Setting permissions..."
chmod 755 logs
chmod 755 uploads

# Install build essentials if not already installed
echo "Checking and installing build dependencies..."
if ! command -v gcc &> /dev/null || ! command -v make &> /dev/null || ! command -v python3 &> /dev/null; then
    echo "Installing build-essential and python..."
    sudo apt-get update
    sudo apt-get install -y build-essential python3
fi

# Install dependencies
echo "Installing dependencies..."
# Remove node_modules/bcrypt if it exists to force recompilation
if [ -d "node_modules/bcrypt" ]; then
    echo "Removing existing bcrypt module to force recompilation..."
    rm -rf node_modules/bcrypt
fi

# Install dependencies with production flag
npm install --production

# Verify bcrypt installation
if [ ! -d "node_modules/bcrypt/lib/binding" ]; then
    echo "bcrypt binding directory not found. Attempting to rebuild bcrypt..."
    npm rebuild bcrypt --update-binary
fi

# Rebuild all native modules to ensure compatibility with the current system
echo "Rebuilding native modules to ensure compatibility..."
npm rebuild

# Verify all required dependencies are installed
echo "Verifying all required dependencies..."
if ! node -e "
(async () => {
  try {
    await import('passport');
    await import('passport-google-oauth20');
    console.log('All dependencies verified.');
  } catch(e) {
    console.error('Missing dependency:', e.message);
    process.exit(1);
  }
})();
"; then
    echo "Installing missing dependencies..."
    npm install
fi

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
if ! node src/config/seeder.js; then
    echo "Database seeding failed. Exiting deployment."
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

# Load environment variables from .env file to pass to PM2
echo "Loading environment variables from .env file..."
ENV_VARS=""
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

# Start or restart the apps for the selected environment
for APP_NAME in "${APP_NAMES[@]}"; do
    if pm2 list | grep -q "$APP_NAME"; then
        echo "Restarting existing PM2 process: $APP_NAME"
        # Use eval to properly handle the environment variables
        eval "pm2 restart ecosystem.config.cjs --only $APP_NAME --env $ENV $ENV_VARS"
    else
        echo "Starting new PM2 process: $APP_NAME"
        # Use eval to properly handle the environment variables
        eval "pm2 start ecosystem.config.cjs --only $APP_NAME --env $ENV $ENV_VARS"
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
