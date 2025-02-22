# Deployment Guide

This guide explains how to deploy the Coral Management System backend on a Linux server.

## Prerequisites

1. A Linux server (Ubuntu/Debian recommended)
2. Node.js (v14 or higher)
3. MySQL (v8 or higher)
4. Nginx
5. PM2 (Node.js process manager)

## Step-by-Step Deployment

### 1. Server Setup

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -y pm2 -g
```

### 2. MySQL Setup

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql
```

```sql
CREATE DATABASE coral_management;
CREATE USER 'coraladmin'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON coral_management.* TO 'coraladmin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/coral-app
sudo chown -R $USER:$USER /var/www/coral-app

# Clone repository (or copy files)
cd /var/www/coral-app
git clone <repository-url> .
cd backend

# Install dependencies
npm install --production

# Create and configure environment file
cp .env.example .env
nano .env
```

Update the .env file with your production settings:
```env
NODE_ENV=production
PORT=5000

MYSQL_USER=coraladmin
MYSQL_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306

JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=24h

# Email settings (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
SMTP_FROM="Coral Management System <your_email@gmail.com>"

# WhatsApp settings (if using)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=your_whatsapp_number

# Admin user
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password
ADMIN_NAME="System Admin"
```

### 4. Initialize Database

```bash
# Run database seeder
npm run seed
```

### 5. Configure PM2

Create ecosystem.config.js in the backend directory:
```bash
nano ecosystem.config.js
```

Add the following content:
```javascript
module.exports = {
  apps: [{
    name: 'coral-backend',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    }
  }]
};
```

Start the application with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Configure Nginx

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/coral-backend
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your_domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Handle file uploads
    location /uploads {
        alias /var/www/coral-app/backend/uploads;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/coral-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Set Up SSL (Optional but Recommended)

Install Certbot and get SSL certificate:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

### 8. File Permissions

Set proper permissions for uploads directory:
```bash
mkdir -p /var/www/coral-app/backend/uploads
sudo chown -R www-data:www-data /var/www/coral-app/backend/uploads
sudo chmod -R 755 /var/www/coral-app/backend/uploads
```

### Maintenance and Monitoring

#### View Application Logs
```bash
# View PM2 logs
pm2 logs coral-backend

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

#### Update Application
```bash
cd /var/www/coral-app/backend
git pull
npm install --production
pm2 restart coral-backend
```

#### Backup Database
```bash
# Create backup
mysqldump -u coraladmin -p coral_management > backup.sql

# Restore backup
mysql -u coraladmin -p coral_management < backup.sql
```

### Troubleshooting

1. If the application isn't starting:
   - Check PM2 logs: `pm2 logs`
   - Verify environment variables: `pm2 env 0`
   - Check Node.js version: `node -v`

2. If uploads aren't working:
   - Check directory permissions
   - Verify Nginx configuration
   - Check file size limits in Nginx config

3. If database connection fails:
   - Verify MySQL is running: `sudo systemctl status mysql`
   - Check database credentials
   - Verify database exists and permissions are correct

4. If Nginx shows 502 Bad Gateway:
   - Verify application is running: `pm2 list`
   - Check if port 5000 is in use: `sudo lsof -i :5000`
   - Check Nginx error logs

### Security Considerations

1. Configure firewall:
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

2. Set up regular backups
3. Keep system and packages updated
4. Monitor server resources
5. Implement rate limiting in Nginx
6. Use strong passwords
7. Keep SSL certificates up to date
