import { validationResult } from 'express-validator';
import Category from '../models/Category.js';
import Coral from '../models/Coral.js';

export const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Error creating category' });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const where = includeInactive === 'true' ? {} : { status: 'ACTIVE' };
    
    const categories = await Category.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    // Get coral counts for each category
    const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
      const count = await Coral.count({
        where: { categoryId: category.id }
      });
      
      return {
        ...category.toJSON(),
        coralCount: count
      };
    }));
    
    res.json(categoriesWithCounts);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Error fetching category' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update(req.body);
    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Error updating category' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has any corals
    const coralsCount = await Coral.count({
      where: { categoryId: category.id }
    });

    if (coralsCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category that contains corals. Please remove or reassign all corals first.' 
      });
    }

    // Permanently delete the category since it's empty
    await category.destroy();
    res.json({ message: 'Category permanently deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
};

export const restoreCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update({ status: 'ACTIVE' });
    res.json({ message: 'Category restored successfully' });
  } catch (error) {
    console.error('Restore category error:', error);
    res.status(500).json({ message: 'Error restoring category' });
  }
};

export const getCategoryWithCorals = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [{
        model: Coral,
        as: 'corals',
        where: { status: 'AVAILABLE' },
        required: false
      }]
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category with corals error:', error);
    res.status(500).json({ message: 'Error fetching category with corals' });
  }
};
