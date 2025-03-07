import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  getAllImages, 
  deleteImage, 
  uncategorizeImage, 
  categorizeImage, 
  uploadImages as uploadImagesController,
  fixUncategorizedImages 
} from '../controllers/imageController.js';
import { uploadImages, handleUploadError } from '../middleware/upload.js';
import { imagePathValidator, categorizeImageValidator, uploadImagesValidator } from '../middleware/validators/imageValidators.js';

const router = express.Router();

// Get all images (admin/superadmin only)
router.get('/', 
  authenticate, 
  authorize('ADMIN', 'SUPERADMIN'), 
  getAllImages
);

// Delete an image (admin/superadmin only)
router.delete('/:category/:filename', 
  authenticate, 
  authorize('ADMIN', 'SUPERADMIN'),
  imagePathValidator,
  deleteImage
);

// Uncategorize an image (admin/superadmin only)
router.post('/:category/:filename/uncategorize',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  imagePathValidator,
  uncategorizeImage
);

// Upload multiple images (admin/superadmin only)
router.post('/upload',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  uploadImages,
  handleUploadError,
  uploadImagesValidator,
  uploadImagesController
);

// Categorize an image (admin/superadmin only)
router.post('/:category/:filename/categorize',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  categorizeImageValidator,
  categorizeImage
);

/**
 * TEMPORARY ROUTE: Fix uncategorized images that are in use by corals
 * This route will be removed once all existing images are properly categorized.
 */
router.post('/fix-uncategorized',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  fixUncategorizedImages
);

export default router;
