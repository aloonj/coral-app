# Frontend Deployment Guide

This guide explains how to deploy the Coral Management System frontend on a Linux server.

## Prerequisites

1. A Linux server (Ubuntu/Debian recommended)
2. Node.js (v14 or higher)
3. Nginx
4. PM2 (Node.js process manager)

## Step-by-Step Deployment

### 1. Server Setup

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -y pm2 -g
```

### 2. Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/coral-app
sudo chown -R $USER:$USER /var/www/coral-app

# Clone repository (or copy files)
cd /var/www/coral-app
git clone <repository-url> .
cd frontend

# Install dependencies
npm install

# Build the application
npm run build

# Create and configure environment file
cp .env.example .env
nano .env
```

Update the .env file with your settings:
```env
# Application
VITE_APP_NAME=Coral Shop
VITE_DEFAULT_CURRENCY=£

# API Configuration
VITE_API_URL=http://your-domain.com/api
```

### 3. Configure PM2

The application comes with a pre-configured `ecosystem.config.cjs` file that supports both production and development environments.

#### Production Deployment

For production deployment, use the deployment script:

```bash
# Start the application in production mode
./deploy.sh production
```

This will:
1. Stop any running development app
2. Start or restart the production app with the correct environment settings

#### Development Deployment

For development deployment, use the deployment script:

```bash
# Start the application in development mode
./deploy.sh development
```

This will:
1. Stop any running production app
2. Start or restart the development app with the correct environment settings

> **Important**: Always use the deployment script instead of starting the ecosystem file directly with PM2. The script ensures only the appropriate app for the selected environment is running.

#### Environment-Specific Configuration

The ecosystem config file defines different app configurations for production and development:

- **Production Environment**:
  - App name: `coral-frontend`
  - Port: 3000
  - Mode: Vite preview (serving built files)
  - Watch mode: Disabled
  - Environment: `NODE_ENV=production`

- **Development Environment**:
  - App name: `dev-coral-frontend`
  - Port: 3001
  - Mode: Vite dev server (with hot reloading)
  - Watch mode: Enabled for automatic reloading
  - Environment: `NODE_ENV=development`

After starting the application, save the PM2 configuration:

```bash
pm2 save
pm2 startup
```

### 4. Configure Nginx

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/coral-frontend
```

Add the following configuration for production:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

For development environment, create a separate configuration:
```bash
sudo nano /etc/nginx/sites-available/coral-frontend-dev
```

```nginx
server {
    listen 80;
    server_name dev.your-domain.com;  # Replace with your development domain

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Enable the sites and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/coral-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/coral-frontend-dev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Set Up SSL (Optional but Recommended)

Install Certbot and get SSL certificates:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo certbot --nginx -d dev.your-domain.com
```

### Maintenance and Monitoring

#### View Application Logs
```bash
# View PM2 logs for production
pm2 logs coral-frontend

# View PM2 logs for development
pm2 logs dev-coral-frontend

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

#### Update Application
```bash
cd /var/www/coral-app/frontend
git pull
npm install
npm run build

# Restart production app
pm2 restart coral-frontend

# Restart development app
pm2 restart dev-coral-frontend
```

### Troubleshooting

1. If the application isn't starting:
   - Check PM2 logs: `pm2 logs`
   - Verify environment variables: `pm2 env 0`
   - Check Node.js version: `node -v`

2. If Nginx shows 502 Bad Gateway:
   - Verify application is running: `pm2 list`
   - Check if port 3000/3001 is in use: `sudo lsof -i :3000` or `sudo lsof -i :3001`
   - Check Nginx error logs

3. If assets aren't loading:
   - Check browser console for CORS errors
   - Verify Nginx configuration
   - Check if paths in the built files are correct

### Security Considerations

1. Configure firewall:
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

2. Keep system and packages updated
3. Monitor server resources
4. Implement rate limiting in Nginx
5. Keep SSL certificates up to date
