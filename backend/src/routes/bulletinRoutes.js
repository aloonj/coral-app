import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImages, handleUploadError } from '../middleware/upload.js';
import {
  createBulletin,
  getAllBulletins,
  getBulletinById,
  updateBulletin,
  deleteBulletin,
  getUnreadCount
} from '../controllers/bulletinController.js';

const router = express.Router();

// Validation middleware
const bulletinValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
  body('type')
    .isIn(['NEWS', 'ANNOUNCEMENT', 'PROMOTION', 'MAINTENANCE', 'NEW_STOCK'])
    .withMessage('Invalid bulletin type'),
  body('priority')
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Invalid priority level'),
  body('publishDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid publish date format'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format')
    .custom((value, { req }) => {
      if (value && req.body.publishDate && value <= req.body.publishDate) {
        throw new Error('Expiry date must be after publish date');
      }
      return true;
    }),
  body('status')
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
    .withMessage('Invalid status'),
  body('sendNotification')
    .optional()
    .isBoolean()
    .withMessage('Send notification must be a boolean')
];

// Public routes (requires authentication)
router.get('/',
  authenticate,
  getAllBulletins
);

router.get('/unread-count',
  authenticate,
  getUnreadCount
);

router.get('/:id',
  authenticate,
  getBulletinById
);

// Admin routes
router.post('/',
  authenticate,
  authorize('ADMIN'),
  uploadImages,
  handleUploadError,
  bulletinValidation,
  createBulletin
);

router.put('/:id',
  authenticate,
  authorize('ADMIN'),
  uploadImages,
  handleUploadError,
  bulletinValidation,
  updateBulletin
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  deleteBulletin
);

export default router;
