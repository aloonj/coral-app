import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import Client from '../models/Client.js';
import { sequelize } from '../config/database.js';
import NotificationService from '../services/notificationService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Admin user management
export const getAdminUsers = async (req, res) => {
  try {
    const adminUsers = await User.findAll({
      where: { 
        role: ['ADMIN', 'SUPERADMIN']
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(adminUsers);
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ message: 'Error fetching admin users' });
  }
};

export const addAdminUser = async (req, res) => {
  try {
    const { email, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8) + 
      Math.random().toString(36).slice(-8) + 
      '!1'; // Ensure it meets password requirements

    // Create admin user
    const user = await User.create({
      email,
      password: temporaryPassword,
      name,
      role: 'ADMIN'
    });

    // Send email with temporary password
    await NotificationService.sendTemporaryPasswordEmail(user, temporaryPassword);

    res.status(201).json({
      message: 'Admin user created successfully. A temporary password has been sent to their email.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Add admin user error:', error);
    res.status(500).json({ message: 'Error creating admin user' });
  }
};

export const regenerateAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ 
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only superadmins can reset superadmin passwords
    if (user.role === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'Only superadmins can reset superadmin passwords' });
    }

    // Generate new temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8) + 
      Math.random().toString(36).slice(-8) + 
      '!1'; // Ensure it meets password requirements

    user.password = temporaryPassword;
    await user.save();

    // Send email with temporary password
    await NotificationService.sendTemporaryPasswordEmail(user, temporaryPassword);

    res.json({
      message: 'Password regenerated successfully. A temporary password has been sent to the user\'s email.'
    });
  } catch (error) {
    console.error('Regenerate admin password error:', error);
    res.status(500).json({ message: 'Error regenerating password' });
  }
};

export const updateAdminRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Only superadmins can change roles
    if (req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'Only superadmins can change user roles' });
    }

    // Validate role is either ADMIN or SUPERADMIN
    if (!['ADMIN', 'SUPERADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be ADMIN or SUPERADMIN' });
    }

    const user = await User.findOne({ 
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent superadmin from demoting themselves
    if (user.id === req.user.id) {
      return res.status(403).json({ message: 'Cannot change your own role' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update admin role error:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    
    // Only superadmins can edit admin users
    if (req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'Only superadmins can edit admin users' });
    }

    const user = await User.findOne({ 
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    user.name = name;
    user.email = email;
    await user.save();

    res.json({
      message: 'Admin user updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({ message: 'Error updating admin user' });
  }
};

export const removeAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ 
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent removing SUPERADMIN
    if (user.role === 'SUPERADMIN') {
      return res.status(403).json({ message: 'Cannot remove superadmin user' });
    }

    // Only allow removing ADMIN users
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Can only remove admin users' });
    }

    await user.destroy();
    res.json({ message: 'Admin user removed successfully' });
  } catch (error) {
    console.error('Remove admin user error:', error);
    res.status(500).json({ message: 'Error removing admin user' });
  }
};

export const clientRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user and client in a transaction
    const result = await sequelize.transaction(async (t) => {
      // Create user
      const user = await User.create({
        email,
        password,
        name,
        role: 'CLIENT'
      }, { transaction: t });

      // Create corresponding client record
      const client = await Client.create({
        email,
        name,
        phone,
        address,
        userId: user.id  // Link to user via foreign key
      }, { transaction: t });

      return { user, client };
    });

    const { user } = result;

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful! You can now log in.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Client registration error:', error);
    res.status(500).json({ message: 'Error registering client' });
  }
};


export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user and client in a transaction
    const result = await sequelize.transaction(async (t) => {
      // Create user
      const user = await User.create({
        email,
        password,
        name,
        role: 'CLIENT'
      }, { transaction: t });

      // Create corresponding client record
      const client = await Client.create({
        email,
        name,
        userId: user.id  // Link to user via foreign key
      }, { transaction: t });

      return { user, client };
    });

    const { user } = result;

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
};

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user from database
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate current password
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    try {
      await user.save();
      res.json({ message: 'Password updated successfully' });
    } catch (validationError) {
      if (validationError.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          message: 'Password validation failed',
          errors: validationError.errors.map(err => err.message)
        });
      }
      throw validationError;
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};
