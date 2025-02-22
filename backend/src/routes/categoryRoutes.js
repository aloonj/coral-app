import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  restoreCategory,
  getCategoryWithCorals
} from '../controllers/categoryController.js';

const router = express.Router();

// Validation middleware
const categoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

// All routes require authentication
router.get('/', authenticate, getAllCategories);
router.get('/:id', authenticate, getCategoryById);
router.get('/:id/corals', authenticate, getCategoryWithCorals);

// Admin only routes
router.post('/',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  categoryValidation,
  createCategory
);

router.put('/:id',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  categoryValidation,
  updateCategory
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  deleteCategory
);

router.post('/:id/restore',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  restoreCategory
);

export default router;
