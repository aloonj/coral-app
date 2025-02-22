import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadCoralImage, handleUploadError } from '../middleware/upload.js';
import {
  createCoral,
  getAllCorals,
  getCoralById,
  updateCoral,
  deleteCoral
} from '../controllers/coralController.js';

const router = express.Router();

// Validation middleware
const coralValidation = [
  body('speciesName').notEmpty().withMessage('Species name is required'),
  body('scientificName').notEmpty().withMessage('Scientific name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('categoryId').isInt({ min: 1 }).withMessage('Valid category is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  body('minimumStock').isInt({ min: 0 }).withMessage('Minimum stock must be a non-negative number'),
  body('careLevel').optional().isIn(['EASY', 'MODERATE', 'EXPERT']).withMessage('Invalid care level'),
  body('growthRate').optional().isIn(['SLOW', 'MODERATE', 'FAST']).withMessage('Invalid growth rate'),
  body('lightingRequirements').optional(),
  body('waterFlow').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid water flow'),
  // Image validation removed as we're now handling file uploads
];

// Routes
router.post('/',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  uploadCoralImage,
  handleUploadError,
  coralValidation,
  createCoral
);

router.get('/', authenticate, getAllCorals);

router.get('/:id', authenticate, getCoralById);

router.put('/:id',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  uploadCoralImage,
  handleUploadError,
  coralValidation,
  updateCoral
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  deleteCoral
);

export default router;
