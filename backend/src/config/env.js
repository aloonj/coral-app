import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Required environment variables
const requiredEnvVars = [
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'DB_HOST',
  'DB_PORT',
  'JWT_SECRET',
  'MYSQL_DATABASE'
];

// Optional environment variables with defaults
const envDefaults = {
  NODE_ENV: 'development',
  PORT: '5000',
  JWT_EXPIRES_IN: '24h',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  MAX_FILE_SIZE: '5242880',
  ALLOWED_FILE_TYPES: 'image/jpeg,image/png,image/jpg'
};

// Validate required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Set default values for optional environment variables
Object.entries(envDefaults).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

  // Environment configuration object
const env = {
  // Frontend URL for links in emails
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Backup
  backup: {
    directory: process.env.BACKUPS,
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 10),
    scheduleTime: process.env.BACKUP_SCHEDULE_TIME || "0 2 * * *",
    monitorSchedule: process.env.BACKUP_MONITOR_SCHEDULE || "0 9 * * *", // Default 9 AM daily
    maxAgeHours: parseInt(process.env.BACKUP_MAX_AGE_HOURS, 10) || 48 // Default 48 hours
  },
  
  // Xero Integration
  xero: {
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUri: process.env.XERO_REDIRECT_URI,
    tenantId: process.env.XERO_TENANT_ID,
    isConfigured: !!(
      process.env.XERO_CLIENT_ID &&
      process.env.XERO_CLIENT_SECRET &&
      process.env.XERO_REDIRECT_URI
    )
  },

  // Server
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10),
  isDevelopment: process.env.NODE_ENV === 'development',

  // Database
  database: {
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    name: process.env.MYSQL_DATABASE
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    isConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
  },

  // WhatsApp
  whatsapp: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    number: process.env.TWILIO_WHATSAPP_NUMBER,
    isConfigured: !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_NUMBER
    )
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10),
    allowedTypes: process.env.ALLOWED_FILE_TYPES.split(',')
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME
  }
};

export default env;
