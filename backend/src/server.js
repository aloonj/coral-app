import express from 'express';
import cors from 'cors';
import { sequelize } from './config/database.js';
import { Op } from 'sequelize';
import './models/associations.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { securityMiddleware, errorHandler } from './middleware/security.js';
import authRoutes from './routes/authRoutes.js';
import coralRoutes from './routes/coralRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import bulletinRoutes from './routes/bulletinRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Make Op available globally for models
global.Op = Op;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy - needed for Cloudflare
app.set('trust proxy', 1);

// Security middleware
app.use(securityMiddleware);

// Strict CORS for authorized frontend only
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve static files with security headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdir(uploadsDir, { recursive: true })
  .then(() => console.log('Uploads directory ready'))
  .catch(err => console.error('Error creating uploads directory:', err));

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/corals', coralRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bulletins', bulletinRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/notifications', notificationRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Coral Management System API' });
});

// Global error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Resource not found'
  });
});

// Initialize models and associations, then sync database
sequelize.sync({ force: false })
  .then(() => {
    console.log('Database synced successfully (without altering tables)');
    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || 'localhost';
    app.listen(PORT, HOST, () => {
      console.log(`Server is running on ${HOST}:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
  });
