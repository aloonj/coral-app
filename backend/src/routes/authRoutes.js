import express from 'express';
import { body } from 'express-validator';
import passport from 'passport';
import jwt from 'jsonwebtoken';
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
router.get('/google', (req, res, next) => {
  console.log('Google auth route hit with query:', req.query);
  
  // Handle preflight checks from the frontend
  if (req.query.preflight === 'true') {
    console.log('Handling preflight request for Google auth');
    return res.status(200).send('OK');
  }
  
  // Add delay to ensure passport is fully initialized (2ms is enough to push to next event loop tick)
  setTimeout(() => {
    console.log('Initializing passport authentication after delay');
    try {
      passport.authenticate('google', { 
        scope: ['profile', 'email'],
        state: true // For CSRF protection
      })(req, res, next);
    } catch (error) {
      console.error('Error initializing passport:', error);
      res.status(500).json({ message: 'Authentication service error' });
    }
  }, 2);
});

// Google login route (GET method for simplicity)
router.get('/google-login', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/api/auth/google`);
});

// Google callback route with explicit initialization and timing protection
router.get('/google/callback', (req, res, next) => {
  console.log('Google callback route hit with query params:', req.query);
  console.log('Full callback URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
  
  // Add a slight delay to ensure passport is fully initialized (2ms is enough to push to next event loop tick)
  setTimeout(() => {
    console.log('Initializing passport authentication for callback after delay');
    try {
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
  }, 2);
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
