import multer from 'multer';
import path from 'path';
import { getUploadPath, ensureUploadPath, getGeneralUploadPath } from '../utils/fileUtils.js';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      let uploadPath;
      if (req.body.categoryId) {
        // Coral image upload
        uploadPath = await getUploadPath(req.body.categoryId);
      } else if (req.body.category) {
        // General image upload
        uploadPath = await getGeneralUploadPath(req.body.category);
      } else {
        uploadPath = 'uncategorized';
      }
      const fullPath = await ensureUploadPath(uploadPath);
      cb(null, fullPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: async function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    // Store the relative path for later use
    try {
      let categoryPath;
      if (req.body.categoryId) {
        // Coral image upload
        const uploadPath = await getUploadPath(req.body.categoryId);
        categoryPath = path.join(uploadPath, filename);
      } else if (req.body.category) {
        // General image upload
        const uploadPath = await getGeneralUploadPath(req.body.category);
        categoryPath = path.join(uploadPath, filename);
      } else {
        categoryPath = path.join('uncategorized', filename);
      }
      req.generatedFilePath = categoryPath;
      cb(null, filename);
    } catch (error) {
      console.error('Error generating file path:', error);
      req.generatedFilePath = path.join('uncategorized', filename);
      cb(null, filename);
    }
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow common file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Supported image types: JPEG, PNG, GIF, WebP'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to handle file uploads
export const uploadImages = upload.array('attachments', 20); // Allow up to 20 attachments for admins

// Specific middleware for coral images
export const uploadCoralImage = upload.single('image'); // Single image upload for corals

// Error handling middleware
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
