import { validationResult } from 'express-validator';
import Coral from '../models/Coral.js';

export const createCoral = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const coralData = {
      ...req.body,
      createdBy: req.user.id,
      imageUrl: req.file ? req.generatedFilePath : null // Store full relative path if image was uploaded
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
    if (req.file) {
      // If a new image is uploaded, update the imageUrl with full relative path
      updateData.imageUrl = req.generatedFilePath;
    } else if (req.body.imageUrl === 'null' || req.body.imageUrl === null) {
      // If explicitly set to null (either string 'null' or actual null), remove the image
      updateData.imageUrl = null;
    } else if (req.body.imageUrl) {
      // If an existing image is selected, use the path as-is
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
