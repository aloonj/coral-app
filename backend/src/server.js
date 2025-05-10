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
import xeroRoutes from './routes/xeroRoutes.js';
import xeroService from './services/xeroService.js';

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

// CRITICAL: Register explicit route handler for callback URL BEFORE the middleware
// This ensures the route exists in Express's route table and can NEVER 404
app.get('/api/auth/google/callback', (req, res, next) => {
  console.log('🚨 PRIMARY CALLBACK HANDLER: Caught Google callback:', req.url);
  
  // First, check if there are other query parameters - if not, add a dummy one
  // This can help with certain edge cases where empty callbacks cause issues
  if (!req.url.includes('?')) {
    return res.redirect(`/api/auth/google/callback?_=${Date.now()}`);
  }
  
  // Log all headers to help debug the issue
  console.log('Headers:', req.headers);
  
  // Always process through the failsafe handler
  handleGoogleCallback(req, res);
});

// Handle the actual callback processing in a separate function for reuse
async function handleGoogleCallback(req, res) {
  console.log('🔄 Processing Google callback:', req.url);
  
  // Retry mechanism with exponential backoff
  let retryCount = 0;
  const maxRetries = 3;
  
  // First, ensure the Google strategy is initialized
  if (!passport._strategies.google) {
    console.log('Google strategy not found in server handler, initializing...');
    configurePassport();
    
    // Small delay to ensure initialization completes
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Force a small delay before processing the callback
  // This gives the Google strategy time to fully initialize
  setTimeout(() => {
    const processCallback = () => {
      retryCount++;
      console.log(`⚡ Attempt ${retryCount}/${maxRetries} processing Google callback`);
      
      try {
        
        // Try to authenticate with Google strategy
        passport.authenticate('google', { 
          session: false,
          failWithError: true
        })(req, res, (err) => {
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
    
    // Start the process immediately
    processCallback();
  }, 50); // Small delay to ensure Google strategy is initialized
}

// Additional failsafe middleware that catches any requests that somehow missed the explicit route
app.use((req, res, next) => {
  // Only intercept GET requests to the callback URL
  if (req.method === 'GET' && req.url.includes('/api/auth/google/callback')) {
    console.log('🚨 BACKUP CATCH: Callback reached middleware fallback, processing');
    return handleGoogleCallback(req, res);
  }
  
  // For all other requests, continue to next middleware
  next();
});

// Auth routes - register AFTER our special callback handlers
app.use('/api/auth', (req, res, next) => {
  // Special check for callback URL in case it somehow got through to here
  if (req.method === 'GET' && req.path.includes('/google/callback')) {
    console.log('🔴 LAST CHANCE CATCH: Callback reached auth routes, redirecting to handler');
    return handleGoogleCallback(req, res);
  }
  next();
}, authRoutes);
app.use('/api/corals', coralRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bulletins', bulletinRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/xero', xeroRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Coral Management System API' });
});

// Global error handling middleware
app.use(errorHandler);

// Redundant safety - final catch-all for the callback URL in case all other handlers failed
app.get('/api/auth/google/callback', (req, res) => {
  console.log('⚠️ FINAL FALLBACK: Callback reached last-resort handler');
  handleGoogleCallback(req, res);
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
  .then(async () => {
    console.log('Database synced successfully (without altering tables)');
    
    // Initialize Xero service before starting the server
    console.log('Initializing Xero service...');
    try {
      await xeroService.initialize();
      console.log('Xero service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Xero service:', error);
      console.log('Server will continue starting, but Xero integration may not work properly until initialized');
    }
    
    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || 'localhost';
    app.listen(PORT, HOST, () => {
      console.log(`Server is running on ${HOST}:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
  });
