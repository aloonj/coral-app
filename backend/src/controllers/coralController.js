import { validationResult } from 'express-validator';
import Coral from '../models/Coral.js';
import Category from '../models/Category.js';
import path from 'path';
import { 
  getUploadsBaseDir, 
  sanitizeCategoryName
} from '../utils/fileUtils.js';
import { promises as fsPromises } from 'fs';

// Helper function to move files
const moveFile = async (sourcePath, targetPath) => {
  try {
    // Ensure target directory exists
    await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });
    
    // Check if source and target are on the same filesystem
    try {
      await fsPromises.rename(sourcePath, targetPath);
    } catch (renameError) {
      // If rename fails, try copy + delete as fallback
      console.log('Rename failed, trying copy + delete instead:', renameError.message);
      const content = await fsPromises.readFile(sourcePath);
      await fsPromises.writeFile(targetPath, content);
      await fsPromises.unlink(sourcePath);
    }
  } catch (error) {
    console.error('Error moving file:', error);
    throw error;
  }
};

const uploadsDir = getUploadsBaseDir();
const coralsDir = path.join(uploadsDir, 'corals');

export const createCoral = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let imageUrl = req.file ? req.generatedFilePath : null;
    
    // Get category info if we have an image to process
    if ((req.file || (req.body.imageUrl && req.body.imageUrl.startsWith('uncategorized/'))) && req.body.categoryId) {
      try {
        const category = await Category.findByPk(req.body.categoryId);
        if (!category) {
          return res.status(400).json({ message: 'Invalid category' });
        }
        
        // Determine the source path and filename
        let sourcePath;
        let filename;
        
        if (req.file) {
          // For newly uploaded files
          filename = req.originalFilename;
          sourcePath = path.join(uploadsDir, 'uncategorized', filename);
        } else if (req.body.imageUrl) {
          // For existing image selection
          const imagePath = req.body.imageUrl;
          filename = path.basename(imagePath);
          sourcePath = path.join(uploadsDir, imagePath);
        }
        
        // Check if source file exists
        try {
          await fsPromises.access(sourcePath);
        } catch (err) {
          return res.status(400).json({ 
            message: `Source image not found: ${sourcePath}`,
            details: err.message
          });
        }
        
        // Move image to appropriate category folder
        const sanitizedCategoryName = sanitizeCategoryName(category.name);
        const targetPath = path.join(coralsDir, sanitizedCategoryName, filename);
        const newRelativePath = path.join('corals', sanitizedCategoryName, filename);
        
        // Ensure target directory exists
        await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });
        
        await moveFile(sourcePath, targetPath);
        imageUrl = newRelativePath;
      } catch (error) {
        console.error('Error moving image:', error);
        return res.status(400).json({ 
          message: 'Error moving image to category folder',
          details: error.message
        });
      }
    } else if (req.body.imageUrl && !req.body.imageUrl.startsWith('uncategorized/')) {
      // Use existing image path as-is if it's not from uncategorized
      imageUrl = req.body.imageUrl;
    }

    const coralData = {
      ...req.body,
      createdBy: req.user.id,
      imageUrl: imageUrl
    };

    const coral = await Coral.create(coralData);
    res.status(201).json(coral);
  } catch (error) {
    console.error('Create coral error:', error);
    res.status(500).json({ message: 'Error creating coral' });
  }
};

export const getAllCorals = async (req, res) => {
  try {
    const corals = await Coral.findAll({
      include: [{
        association: 'creator',
        attributes: ['id', 'name', 'email']
      }]
    });


    res.json(corals);
  } catch (error) {
    console.error('Get corals error:', error);
    res.status(500).json({ message: 'Error fetching corals' });
  }
};

export const getCoralById = async (req, res) => {
  try {
    const coral = await Coral.findByPk(req.params.id, {
      include: [{
        association: 'creator',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!coral) {
      return res.status(404).json({ message: 'Coral not found' });
    }


    res.json(coral);
  } catch (error) {
    console.error('Get coral error:', error);
    res.status(500).json({ message: 'Error fetching coral' });
  }
};

export const updateCoral = async (req, res) => {
  try {
    const coral = await Coral.findByPk(req.params.id);
    if (!coral) {
      return res.status(404).json({ message: 'Coral not found' });
    }

    // Check if user has permission
    if (coral.createdBy !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update this coral' });
    }

    const updateData = { ...req.body };
    
    // Handle image updates
    if ((req.file || (req.body.imageUrl && req.body.imageUrl.startsWith('uncategorized/'))) && req.body.categoryId) {
      try {
        const category = await Category.findByPk(req.body.categoryId);
        if (!category) {
          return res.status(400).json({ message: 'Invalid category' });
        }
        
        // Determine the source path and filename
        let sourcePath;
        let filename;
        
        if (req.file) {
          // For newly uploaded files
          filename = req.originalFilename;
          sourcePath = path.join(uploadsDir, 'uncategorized', filename);
        } else if (req.body.imageUrl) {
          // For existing image selection
          const imagePath = req.body.imageUrl;
          filename = path.basename(imagePath);
          sourcePath = path.join(uploadsDir, imagePath);
        }
        
        // Check if source file exists
        try {
          await fsPromises.access(sourcePath);
        } catch (err) {
          return res.status(400).json({ 
            message: `Source image not found: ${sourcePath}`,
            details: err.message
          });
        }
        
        // Move image to appropriate category folder
        const sanitizedCategoryName = sanitizeCategoryName(category.name);
        const targetPath = path.join(coralsDir, sanitizedCategoryName, filename);
        const newRelativePath = path.join('corals', sanitizedCategoryName, filename);
        
        // Ensure target directory exists
        await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });
        
        await moveFile(sourcePath, targetPath);
        updateData.imageUrl = newRelativePath;
      } catch (error) {
        console.error('Error moving image:', error);
        return res.status(400).json({ 
          message: 'Error moving image to category folder',
          details: error.message
        });
      }
    } else if (req.body.imageUrl === 'null' || req.body.imageUrl === null) {
      // If explicitly set to null (either string 'null' or actual null), remove the image
      updateData.imageUrl = null;
    } else if (req.body.imageUrl && !req.body.imageUrl.startsWith('uncategorized/')) {
      // If an existing image is selected and not from uncategorized, use the path as-is
      updateData.imageUrl = req.body.imageUrl;
    }

    const updatedCoral = await coral.update(updateData);
    // Fetch fresh data to ensure we have all relations and current state
    const refreshedCoral = await Coral.findByPk(updatedCoral.id, {
      include: [{
        association: 'creator',
        attributes: ['id', 'name', 'email']
      }]
    });
    res.json(refreshedCoral);
  } catch (error) {
    console.error('Update coral error:', error);
    res.status(500).json({ message: 'Error updating coral' });
  }
};

export const deleteCoral = async (req, res) => {
  try {
    const coral = await Coral.findByPk(req.params.id);
    if (!coral) {
      return res.status(404).json({ message: 'Coral not found' });
    }

    // Check if user has permission
    if (coral.createdBy !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete this coral' });
    }


    await coral.destroy();
    res.json({ message: 'Coral deleted successfully' });
  } catch (error) {
    console.error('Delete coral error:', error);
    res.status(500).json({ message: 'Error deleting coral' });
  }
};
