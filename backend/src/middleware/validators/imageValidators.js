import { param, body } from 'express-validator';
import path from 'path';

const allowedCategories = ['uncategorized', 'lps', 'sps', 'softs', 'zoanthids', 'mushrooms'];
const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];

export const imagePathValidator = [
  param('category')
    .trim()
    .isIn(allowedCategories)
    .withMessage('Invalid category'),
  param('filename')
    .trim()
    .custom((value) => {
      const ext = path.extname(value).toLowerCase();
      if (!allowedImageTypes.includes(ext)) {
        throw new Error('Invalid file type');
      }
      // Check for path traversal attempts
      if (value.includes('..') || value.includes('/') || value.includes('\\')) {
        throw new Error('Invalid filename');
      }
      return true;
    })
];

export const categorizeImageValidator = [
  ...imagePathValidator,
  body('targetCategory')
    .trim()
    .isIn(allowedCategories)
    .withMessage('Invalid target category')
];

export const uploadImagesValidator = [
  body()
    .custom((value, { req }) => {
      if (!req.files || req.files.length === 0) {
        throw new Error('No files uploaded');
      }
      
      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedImageTypes.includes(ext)) {
          throw new Error(`Invalid file type: ${ext}`);
        }
        
        // Check file size (e.g., 5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File too large. Maximum size is 5MB');
        }
      }
      return true;
    })
];
