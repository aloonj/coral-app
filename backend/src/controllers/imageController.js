import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { promises as fsPromises } from 'fs';
import { validationResult } from 'express-validator';
import Coral from '../models/Coral.js';
import Category from '../models/Category.js';
import { 
  getUploadsBaseDir, 
  validateFilePath, 
  validateCategory,
  validateFileOperation,
  generateSecureFilename,
  sanitizeCategoryName
} from '../utils/fileUtils.js';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

const moveFile = async (sourcePath, targetPath) => {
  try {
    // Validate both source and target paths
    const validatedSource = validateFileOperation(sourcePath);
    const validatedTarget = validateFileOperation(targetPath);
    
    // Ensure target directory exists
    await fsPromises.mkdir(path.dirname(validatedTarget), { recursive: true });
    await fsPromises.rename(validatedSource, validatedTarget);
  } catch (error) {
    console.error('Error moving file:', error);
    throw error;
  }
};

export const uploadImages = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => {
      // Generate secure filename for each file
      const secureFilename = generateSecureFilename(file.originalname);
      return {
        filename: secureFilename,
        path: req.generatedFilePath || path.join('uncategorized', secureFilename)
      };
    });

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ message: 'Error uploading images' });
  }
};

const uploadsDir = getUploadsBaseDir();
const coralsDir = path.join(uploadsDir, 'corals');

export const getAllImages = async (req, res) => {
  try {
    // Ensure corals directory exists
    await fs.promises.mkdir(coralsDir, { recursive: true });
    
    // Get all categories
    const categories = await Category.findAll();
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    // Get all corals to check which images are in use
    const corals = await Coral.findAll({
      attributes: ['imageUrl', 'categoryId'],
      raw: true
    });
    const usedImages = new Map(corals.map(coral => [
      coral.imageUrl,
      categoryMap.get(coral.categoryId)?.name || 'Uncategorized'
    ]));

    // Read uncategorized directory first
    const uncategorizedPath = path.join(uploadsDir, 'uncategorized');
    await fs.promises.mkdir(uncategorizedPath, { recursive: true });
    let allFileDetails = [];
    
    try {
      const uncategorizedFiles = await readdir(uncategorizedPath);
      const uncategorizedDetails = await Promise.all(
        uncategorizedFiles.map(async (filename) => {
          const filePath = path.join(uncategorizedPath, filename);
          // Validate file path and operations
          validateFileOperation(filePath);
          const stats = await stat(filePath);
          const fileSize = stats.size;
          const fileType = path.extname(filename).slice(1).toLowerCase();
          return {
            filename,
            category: 'uncategorized',
            relativePath: path.join('uncategorized', filename),
            createdAt: stats.birthtime,
            inUse: false,
            categoryName: 'Uncategorized',
            size: fileSize,
            type: fileType
          };
        })
      );
      allFileDetails.push(...uncategorizedDetails);
    } catch (error) {
      console.error('Error reading uncategorized directory:', error);
    }

    // Read coral category directories
    const categoryDirs = await readdir(coralsDir);
    
    // Get files from each coral category directory
    for (const dir of categoryDirs) {
      try {
        // Validate category
        const validatedCategory = validateCategory(dir);
        if (validatedCategory === 'uncategorized') continue;
        
        const categoryPath = path.join(coralsDir, validatedCategory);
        const dirStat = await stat(categoryPath);
        
        if (!dirStat.isDirectory()) continue;
        
        const files = await readdir(categoryPath);
        const fileDetails = await Promise.all(
          files.map(async (filename) => {
            const filePath = path.join(categoryPath, filename);
            // Validate file path and operations
            validateFileOperation(filePath);
            validateFilePath(filename);
            
            const stats = await stat(filePath);
            const relativePath = path.join('corals', validatedCategory, filename);
            
            const fileSize = stats.size;
            const fileType = path.extname(filename).slice(1).toLowerCase();
            return {
              filename,
              category: validatedCategory,
              relativePath,
              createdAt: stats.birthtime,
              inUse: usedImages.has(relativePath),
              categoryName: Array.from(usedImages.values()).find(name => 
                validatedCategory === sanitizeCategoryName(name)
              ) || validatedCategory,
              size: fileSize,
              type: fileType
            };
          })
        );
        allFileDetails.push(...fileDetails);
      } catch (error) {
        console.error(`Error processing category ${dir}:`, error);
        continue;
      }
    }

    // Sort by creation time, newest first
    allFileDetails.sort((a, b) => b.createdAt - a.createdAt);

    res.json(allFileDetails);
  } catch (error) {
    console.error('Error getting images:', error);
    res.status(500).json({ message: 'Error retrieving images' });
  }
};

export const uncategorizeImage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, filename } = req.params;
    
    // Validate category and filename
    const validatedCategory = validateCategory(category);
    validateFilePath(filename);
    
    // Don't process if image is already in uncategorized
    if (validatedCategory === 'uncategorized') {
      return res.status(400).json({ message: 'Image is already uncategorized' });
    }

    const sourcePath = path.join(coralsDir, validatedCategory, filename);
    const targetPath = path.join(uploadsDir, 'uncategorized', filename);
    const relativeSourcePath = path.join('corals', validatedCategory, filename);

    // Validate file paths
    validateFileOperation(sourcePath);
    validateFileOperation(targetPath);

    // Check if file exists
    await stat(sourcePath);
    
    // Check if image is being used by any coral
    const usingCoral = await Coral.findOne({
      where: {
        imageUrl: relativeSourcePath
      }
    });

    if (usingCoral) {
      return res.status(400).json({ 
        message: 'Cannot uncategorize image as it is currently in use by a coral'
      });
    }

    // Move the file to uncategorized directory
    await moveFile(sourcePath, targetPath);
    
    res.json({ message: 'Image uncategorized successfully' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Image not found' });
    } else {
      console.error('Error uncategorizing image:', error);
      res.status(500).json({ message: 'Error uncategorizing image' });
    }
  }
};

export const categorizeImage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, filename } = req.params;
    const { targetCategory } = req.body;

    // Validate all inputs
    const validatedSourceCategory = validateCategory(category);
    const validatedTargetCategory = validateCategory(targetCategory);
    validateFilePath(filename);

    const sourcePath = path.join(uploadsDir, validatedSourceCategory, filename);
    const targetPath = path.join(coralsDir, validatedTargetCategory, filename);

    // Validate file paths
    validateFileOperation(sourcePath);
    validateFileOperation(targetPath);

    // Check if file exists
    await stat(sourcePath);

    // Move the file to the target category directory
    await moveFile(sourcePath, targetPath);
    
    res.json({ 
      message: 'Image categorized successfully',
      newPath: path.join('corals', validatedTargetCategory, filename)
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Image not found' });
    } else {
      console.error('Error categorizing image:', error);
      res.status(500).json({ message: 'Error categorizing image' });
    }
  }
};

export const deleteImage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, filename } = req.params;
    
    // Validate inputs
    const validatedCategory = validateCategory(category);
    validateFilePath(filename);

    const filePath = validatedCategory === 'uncategorized' 
      ? path.join(uploadsDir, 'uncategorized', filename)
      : path.join(coralsDir, validatedCategory, filename);
    const relativePath = validatedCategory === 'uncategorized'
      ? path.join('uncategorized', filename)
      : path.join('corals', validatedCategory, filename);

    // Validate file path
    validateFileOperation(filePath);

    // Check if file exists
    await stat(filePath);
    
    // Check if image is being used by any coral
    const usingCoral = await Coral.findOne({
      where: {
        imageUrl: relativePath
      }
    });

    if (usingCoral) {
      return res.status(400).json({ 
        message: 'Cannot delete image as it is currently in use by a coral'
      });
    }

    // Delete the file
    await unlink(filePath);
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Image not found' });
    } else {
      console.error('Error deleting image:', error);
      res.status(500).json({ message: 'Error deleting image' });
    }
  }
};
