import { param, body } from 'express-validator';
import path from 'path';
import { sanitizeCategoryName } from '../../utils/fileUtils.js';

// We'll use a more flexible approach for categories
const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];

export const imagePathValidator = [
  param('category')
    .trim()
    .custom(value => {
      // Always allow uncategorized
      if (value === 'uncategorized') {
        return true;
      }
      
      // For other categories, we'll be more flexible
      // This allows for new categories to be added to the database without updating this list
      return true;
    }),
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
    .custom(value => {
      // Always allow uncategorized
      if (value === 'uncategorized') {
        return true;
      }
      
      // For other categories, we'll be more flexible
      // This allows for new categories to be added to the database without updating this list
      return true;
    })
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
