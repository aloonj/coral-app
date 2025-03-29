# Coral Management System Backend

A comprehensive backend system for managing coral inventory, orders, and client communications.

## Features

- 🔐 Authentication system with role-based access control
- 📦 Coral inventory management with categories
- 🛒 Order processing system
- 📨 Email and WhatsApp notifications
- 📢 News bulletin system
- 📁 File upload handling for coral images
- 🔄 Automatic stock level management
- 💾 Automated backup system
- 👥 Client management portal
- 📊 Advanced notification queue system

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

## Setup Instructions

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the .env file with your configuration:
   - Database credentials
   - JWT secret
   - SMTP settings for email
   - Twilio credentials for WhatsApp (optional)
   - Admin user details
   - Backup configuration
   - Notification settings

5. Create the MySQL database:
   ```sql
   CREATE DATABASE coral_management;
   ```

6. Run the database seeder to create initial data:
   ```bash
   npm run seed
   ```

## Deployment

For production or development deployment, use the enhanced deployment script:

```bash
# For development environment
./deploy.sh development

# For production environment
./deploy.sh production
```

The deployment script handles:
- Installing necessary build dependencies
- Setting up directories and permissions
- Installing Node.js dependencies
- Verifying and installing missing dependencies (like passport)
- Rebuilding native modules (like bcrypt) for compatibility
- Database initialization
- PM2 process management
- Environment-specific configuration

See `DEPLOYMENT.md` for detailed deployment instructions and troubleshooting.

## Development

Start the development server with hot reload:
```bash
npm run dev
```

The server will start on http://localhost:5000 by default.

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login
- GET /api/auth/profile - Get user profile

### Categories
- GET /api/categories - List all categories
- POST /api/categories - Create category (Admin)
- GET /api/categories/:id - Get category details
- PUT /api/categories/:id - Update category (Admin)
- DELETE /api/categories/:id - Delete category (Admin)

### Corals
- GET /api/corals - List all corals
- POST /api/corals - Add new coral (Admin)
- GET /api/corals/:id - Get coral details
- PUT /api/corals/:id - Update coral (Admin)
- DELETE /api/corals/:id - Delete coral (Admin)

### Orders
- POST /api/orders - Create new order
- GET /api/orders - List orders (Admin sees all, Client sees own)
- GET /api/orders/:id - Get order details
- PUT /api/orders/:id/status - Update order status (Admin)
- POST /api/orders/:id/cancel - Cancel order

### Bulletins
- GET /api/bulletins - List bulletins
- POST /api/bulletins - Create bulletin (Admin)
- GET /api/bulletins/:id - Get bulletin details
- PUT /api/bulletins/:id - Update bulletin (Admin)
- DELETE /api/bulletins/:id - Delete bulletin (Admin)
- GET /api/bulletins/unread-count - Get unread bulletins count

### Backups
- GET /api/backups - List all backups
- POST /api/backups - Trigger manual backup
- GET /api/backups/:id - Get backup details
- GET /api/backups/:id/download - Download backup file
- DELETE /api/backups/:id - Delete backup

### Notifications
- GET /api/notifications - List notifications
- POST /api/notifications - Create notification
- PUT /api/notifications/:id/read - Mark notification as read
- DELETE /api/notifications/:id - Delete notification
- GET /api/notifications/unread-count - Get unread count

### Clients
- GET /api/clients - List all clients
- POST /api/clients - Create new client
- GET /api/clients/:id - Get client details
- PUT /api/clients/:id - Update client
- DELETE /api/clients/:id - Delete client
- GET /api/clients/:id/orders - Get client orders

## Environment Variables

Required environment variables:

```env
# Database Configuration
MYSQL_USER=your_db_user
MYSQL_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Admin Configuration
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_password
ADMIN_NAME="System Admin"

# Backup Configuration
BACKUP_DIRECTORY=/path/to/backups
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 0 * * *"

# Notification Queue Configuration
QUEUE_PROCESSING_INTERVAL=5000
MAX_RETRY_ATTEMPTS=3
```

Optional environment variables:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
SMTP_FROM="Coral Management System <your_email@gmail.com>"

# WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=your_whatsapp_number

# Image Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=".jpg,.jpeg,.png,.webp"
IMAGE_COMPRESSION_QUALITY=80
```

## File Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── middleware/     # Custom middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
├── workers/        # Background workers
│   ├── backupWorker.js    # Automated backup system
│   └── notificationWorker.js # Notification queue processor
└── server.js       # Application entry point
```

## Background Workers

### Backup Worker
- Runs on a configurable schedule (default: daily at midnight)
- Creates compressed database backups
- Manages backup retention
- Supports manual trigger through API

### Notification Worker
- Processes notification queue
- Handles retry logic for failed notifications
- Supports multiple notification channels (email, WhatsApp)
- Manages notification status and history

## Error Handling

The API uses standard HTTP status codes and returns errors in the following format:

```json
{
  "message": "Error message here",
  "errors": [] // Validation errors if applicable
}
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation
- File upload restrictions
- CORS configuration
- Rate limiting
- Request sanitization
- SQL injection protection

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
