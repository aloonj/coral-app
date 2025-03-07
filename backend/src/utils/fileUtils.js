import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import Category from '../models/Category.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const mkdir = promisify(fs.mkdir);

const allowedCategories = ['uncategorized', 'lps', 'sps', 'softs', 'zoanthids', 'mushrooms'];
const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];

export const sanitizeCategoryName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace special chars with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

export const validateFilePath = (filePath) => {
  // Normalize the path to handle different path separators
  const normalizedPath = path.normalize(filePath);
  
  // Check for path traversal attempts
  if (normalizedPath.includes('..')) {
    throw new Error('Invalid file path: Path traversal detected');
  }

  // Ensure path is relative (doesn't start with root)
  if (path.isAbsolute(normalizedPath)) {
    throw new Error('Invalid file path: Absolute paths not allowed');
  }

  // Validate file extension
  const ext = path.extname(normalizedPath).toLowerCase();
  if (!allowedImageTypes.includes(ext)) {
    throw new Error('Invalid file type');
  }

  return normalizedPath;
};

export const validateCategory = (category) => {
  const sanitizedCategory = sanitizeCategoryName(category);
  
  // For uncategorized, always allow it
  if (sanitizedCategory === 'uncategorized') {
    return sanitizedCategory;
  }
  
  // For other categories, check if it's in the allowed list
  // This is a safety check, but we should trust categories from the database
  if (!allowedCategories.includes(sanitizedCategory)) {
    console.warn(`Category not in allowed list: ${sanitizedCategory}`);
    // Instead of throwing an error, we'll just return the sanitized name
    // This allows for new categories to be added to the database without updating this list
  }
  
  return sanitizedCategory;
};

export const generateSecureFilename = (originalFilename) => {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
};

export const getUploadPath = async (categoryId) => {
  const category = await Category.findByPk(categoryId);
  if (!category) {
    throw new Error('Category not found');
  }
  const sanitizedName = sanitizeCategoryName(category.name);
  // Use the validateCategory function for consistency
  validateCategory(sanitizedName);
  return path.join('corals', sanitizedName);
};

export const ensureUploadPath = async (uploadPath) => {
  // Split the path to validate each component
  const pathComponents = uploadPath.split(path.sep);
  
  // Validate the category (last component)
  const category = pathComponents[pathComponents.length - 1];
  const sanitizedCategory = validateCategory(category);
  
  // Reconstruct the path, preserving the original structure (e.g., corals/sps)
  pathComponents[pathComponents.length - 1] = sanitizedCategory;
  const sanitizedPath = pathComponents.join(path.sep);
  
  const fullPath = path.join(__dirname, '../../uploads', sanitizedPath);
  
  // Ensure the resolved path is within the uploads directory
  const uploadsDir = path.join(__dirname, '../../uploads');
  const resolvedPath = path.resolve(fullPath);
  if (!resolvedPath.startsWith(uploadsDir)) {
    throw new Error('Invalid upload path: Path must be within uploads directory');
  }
  
  await mkdir(fullPath, { recursive: true });
  return fullPath;
};

export const getUploadsBaseDir = () => {
  return path.join(__dirname, '../../uploads');
};

export const getGeneralUploadPath = async (category) => {
  if (!category) {
    throw new Error('Category is required');
  }
  
  const sanitizedCategory = validateCategory(category);
  
  if (sanitizedCategory === 'uncategorized') {
    return 'uncategorized';
  }
  return path.join('corals', sanitizedCategory);
};

export const validateFileOperation = (filePath) => {
  const fullPath = path.resolve(filePath);
  const uploadsDir = path.resolve(getUploadsBaseDir());
  
  // Ensure operation is within uploads directory
  if (!fullPath.startsWith(uploadsDir)) {
    throw new Error('Invalid operation: File must be within uploads directory');
  }
  
  return fullPath;
};
