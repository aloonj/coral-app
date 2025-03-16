import express from 'express';
import cors from 'cors';
import { sequelize } from './config/database.js';
import { Op } from 'sequelize';
import './models/associations.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import configurePassport from './config/passport.js';
import { securityMiddleware, errorHandler } from './middleware/security.js';
import authRoutes from './routes/authRoutes.js';
import coralRoutes from './routes/coralRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import bulletinRoutes from './routes/bulletinRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import backupRoutes from './routes/backupRoutes.js';

// Make Op available globally for models
global.Op = Op;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy - needed for Cloudflare and OAuth callbacks
app.set('trust proxy', true);

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

// Initialize passport and get initialization status checker
app.use(passport.initialize());
const passportConfig = configurePassport();

// Global middleware to check passport initialization status
app.use((req, res, next) => {
  // Only check for Google auth related routes
  if (req.path.includes('/api/auth/google')) {
    // Log the status of the Google strategy
    const isInitialized = passportConfig.isInitialized();
    console.log(`Passport Google Strategy initialized: ${isInitialized}`);
    
    // Add initialization status to the request for route handlers
    req.googleStrategyInitialized = isInitialized;
  }
  next();
});

// CRITICAL: Register this special route handler BEFORE any other routes
// to absolutely ensure it's checked first and can never fall through to 404
// This is our bulletproof handler for Google OAuth callbacks
app.use((req, res, next) => {
  // Only intercept GET requests to the callback URL
  if (req.method !== 'GET' || !req.url.includes('/api/auth/google/callback')) {
    return next();
  }
  
  console.log('🚨 CRITICAL INTERCEPT: Caught Google callback in failsafe middleware:', req.url);
  console.log('Request headers:', req.headers);
  
  // Retry mechanism with exponential backoff for callback processing
  let retryCount = 0;
  const maxRetries = 3;
  
  const processCallback = () => {
    retryCount++;
    console.log(`Attempt ${retryCount}/${maxRetries} processing Google callback`);
    console.log('Initializing passport with explicit delay...');
    
    // Ensure passport is initialized before proceeding
    try {
      // Make absolutely sure passport is ready
      const authenticate = passport.authenticate('google', { 
        session: false,
        failWithError: true
      });
      
      authenticate(req, res, (err) => {
        // If we hit an error but have retries left, try again
        if (err && retryCount < maxRetries) {
          console.log(`Authentication error, retrying (${retryCount}/${maxRetries}):`, err.message);
          setTimeout(processCallback, 100 * Math.pow(2, retryCount)); // Exponential backoff
          return;
        }
        
        // Handle all error cases
        if (err) {
          console.error('Final passport authentication error:', err);
          // Redirect to frontend with error
          const redirectUrl = `${process.env.FRONTEND_URL}/login/success?error=${encodeURIComponent('Authentication failed, please try again')}`;
          return res.status(302).location(redirectUrl).send();
        }
        
        // If we get here without error but no user, handle that case too
        if (!req.user) {
          console.error('Authentication completed but no user found');
          const redirectUrl = `${process.env.FRONTEND_URL}/login/success?error=${encodeURIComponent('Authentication failed, no user found')}`;
          return res.status(302).location(redirectUrl).send();
        }
        
        // Authentication successful, generate JWT token
        console.log('✅ Google authentication successful for user:', req.user.email);
        
        try {
          const token = jwt.sign(
            { 
              id: req.user.id, 
              email: req.user.email, 
              role: req.user.role,
              name: req.user.name
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
          );
          
          // Redirect to frontend with token
          const redirectUrl = `${process.env.FRONTEND_URL}/login/success?token=${token}`;
          console.log('Redirecting to:', redirectUrl);
          return res.status(302).location(redirectUrl).send();
        } catch (tokenError) {
          console.error('Error generating token:', tokenError);
          const redirectUrl = `${process.env.FRONTEND_URL}/login/success?error=${encodeURIComponent('Error creating authentication token')}`;
          return res.status(302).location(redirectUrl).send();
        }
      });
    } catch (error) {
      console.error('Critical passport initialization error:', error);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying after error (${retryCount}/${maxRetries})...`);
        setTimeout(processCallback, 100 * Math.pow(2, retryCount)); // Exponential backoff
        return;
      }
      
      // All retries failed, send error to user
      const redirectUrl = `${process.env.FRONTEND_URL}/login/success?error=${encodeURIComponent('Critical authentication system error')}`;
      return res.status(302).location(redirectUrl).send();
    }
  };
  
  // Start the process with a slight delay
  setTimeout(processCallback, 10);
  
  // This is critical - don't pass to next middleware
  // We've taken full responsibility for handling this request
});

// Auth routes - register AFTER our special callback handler
app.use('/api/auth', authRoutes);
app.use('/api/corals', coralRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bulletins', bulletinRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/backups', backupRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Coral Management System API' });
});

// Global error handling middleware
app.use(errorHandler);

// Special handler for the Google OAuth callback URL specifically
// This catches the exact URL pattern that's causing issues
app.get('/api/auth/google/callback', (req, res) => {
  console.log('Explicit catch-all handler for Google callback URL');
  // Redirect to the frontend's callback handler
  res.redirect(`${process.env.FRONTEND_URL}/login/success${req.url.includes('?') ? req._parsedUrl.search : ''}`);
});

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
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
