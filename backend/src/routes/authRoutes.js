import express from 'express';
import { body } from 'express-validator';
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
  updateAdminRole
} from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name').notEmpty().withMessage('Name is required')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', authenticate, authorize('ADMIN', 'SUPERADMIN'), registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', authenticate, getProfile);

// Change password route with validation
router.post('/change-password', 
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
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

export default router;
