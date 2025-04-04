import express from 'express';
import { body } from 'express-validator';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import configurePassport from '../config/passport.js';
import { 
  register, 
  login, 
  getProfile, 
  changePassword,
  getAdminUsers,
  addAdminUser,
  regenerateAdminPassword,
  removeAdminUser,
  updateAdminUser,
  updateAdminRole,
  clientRegister,
  getClientProfile,
  updateClientProfile
} from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>_-]/)
    .withMessage('Password must contain at least one symbol'),
  body('name').notEmpty().withMessage('Name is required'),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .trim()
    .custom(value => {
      return /^[+\d\s-()]+$/.test(value);
    })
    .withMessage('Phone number can only contain numbers, spaces, +, -, and ()'),
  body('address')
    .notEmpty().withMessage('Address is required')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Address must be less than 1000 characters')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', authenticate, authorize('ADMIN', 'SUPERADMIN'), registerValidation, register);
router.post('/client-register', registerValidation, clientRegister);
router.post('/login', loginValidation, login);
router.get('/profile', authenticate, getProfile);
router.get('/client-profile', authenticate, authorize('CLIENT'), getClientProfile);
router.put('/client-profile', authenticate, authorize('CLIENT'), updateClientProfile);

// Change password route with validation
router.post('/change-password', 
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/\d/)
      .withMessage('New password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>_-]/)
      .withMessage('New password must contain at least one symbol')
  ],
  changePassword
);

// Admin user management routes
router.get('/admins', authenticate, authorize('ADMIN', 'SUPERADMIN'), getAdminUsers);
router.post('/admins', authenticate, authorize('ADMIN', 'SUPERADMIN'), [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('name').notEmpty().withMessage('Name is required')
], addAdminUser);
router.post('/admins/:id/regenerate-password', authenticate, authorize('ADMIN', 'SUPERADMIN'), regenerateAdminPassword);
router.put('/admins/:id', authenticate, authorize('SUPERADMIN'), [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('name').notEmpty().withMessage('Name is required')
], updateAdminUser);
router.delete('/admins/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), removeAdminUser);
router.put('/admins/:id/role', authenticate, authorize('SUPERADMIN'), [
  body('role').isIn(['ADMIN', 'SUPERADMIN']).withMessage('Invalid role')
], updateAdminRole);

// Special handler for preflight requests and Google OAuth routes
router.get('/google', async (req, res, next) => {
  console.log('Google auth route hit with query:', req.query);
  
  // Handle preflight checks from the frontend
  if (req.query.preflight === 'true') {
    console.log('Handling preflight request for Google auth');
    return res.status(200).json({ ready: true });
  }
  
  console.log('Ensuring Passport Google strategy is fully initialized...');
  
  try {
    // First, ensure the Google strategy is initialized
    if (!passport._strategies.google) {
      console.log('Google strategy not found, initializing...');
      configurePassport();
    }
    
    // Warm up the strategy by accessing it
    if (passport._strategies.google) {
      console.log('Google strategy found, warming up...');
      const authUrlParams = {
        response_type: 'code',
        redirect_uri: process.env.FRONTEND_URL ? 
          `${process.env.FRONTEND_URL}/api/auth/google/callback` : 
          '/api/auth/google/callback',
        scope: 'profile email'
      };
      
      // This will initialize the strategy without actually redirecting
      passport._strategies.google.authorizationParams(authUrlParams);
      console.log('Google strategy warm-up complete');
    }
    
    // Add a small delay to ensure everything is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Passport initialization complete, proceeding with authentication');
    
    // Now proceed with authentication
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      state: true // For CSRF protection
    })(req, res, next);
  } catch (error) {
    console.error('Error initializing passport:', error);
    res.status(500).json({ message: 'Authentication service error' });
  }
});

// Google login route (GET method for simplicity)
router.get('/google-login', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/api/auth/google`);
});

// Google callback route with enhanced initialization
router.get('/google/callback', async (req, res, next) => {
  console.log('Google callback route hit with query params:', req.query);
  console.log('Full callback URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
  
  // Ensure the Google strategy is initialized before proceeding
  try {
    // First, ensure the Google strategy is initialized
    if (!passport._strategies.google) {
      console.log('Google strategy not found in callback, reinitializing...');
      configurePassport();
      
      // Small delay to ensure initialization completes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('Google strategy is ready, proceeding with callback authentication');
    
    // Ensure passport authentication is explicitly initialized
    passport.authenticate('google', { 
      session: false,
      failWithError: true
    })(req, res, next);
  } catch (error) {
    console.error('Error initializing passport for callback:', error);
    // Explicitly handle any initialization errors
    const redirectUrl = `${process.env.FRONTEND_URL}/login/success?error=${encodeURIComponent('Authentication service error')}`;
    res.status(302).location(redirectUrl).send();
  }
},
  (req, res) => {
    // Authentication successful, generate JWT token
    console.log('Google authentication successful for user:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name
    });
    
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
    
    console.log('JWT token generated successfully');
    
    // Redirect to frontend with token - ensure full URL
    const redirectUrl = `${process.env.FRONTEND_URL}/login/success?token=${token}`;
    console.log('Redirecting to:', redirectUrl);
    // Use 302 status code to ensure proper redirect
    res.status(302).location(redirectUrl).send();
  },
  (err, req, res, next) => {
    // Authentication failed
    console.error('Google authentication error:', err);
    
    let errorMessage = 'Google authentication failed';
    
    // Check if there's a specific error message
    if (err && err.message) {
      errorMessage = err.message;
      console.log('Error message:', errorMessage);
    }
    
    // Redirect to frontend with error - ensure full URL
    const redirectUrl = `${process.env.FRONTEND_URL}/login/success?error=${encodeURIComponent(errorMessage)}`;
    console.log('Redirecting to error URL:', redirectUrl);
    // Use 302 status code to ensure proper redirect
    res.status(302).location(redirectUrl).send();
  }
);


export default router;
