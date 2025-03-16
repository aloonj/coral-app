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

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: true // For CSRF protection
  })
);

// Google login route (GET method for simplicity)
router.get('/google-login', (req, res) => {
  res.redirect('/api/auth/google');
});

// Google callback route
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    session: false
  }),
  (req, res) => {
    // Generate JWT token
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
    res.redirect(`${process.env.FRONTEND_URL}/login/success?token=${token}`);
  }
);

// Feature flag endpoint
router.get('/feature-flags',
  (req, res) => {
    console.log('Feature flags endpoint accessed');
    console.log('ENABLE_GOOGLE_LOGIN:', process.env.ENABLE_GOOGLE_LOGIN);
    res.json({
      googleLoginEnabled: process.env.ENABLE_GOOGLE_LOGIN === 'true'
    });
  }
);

export default router;
