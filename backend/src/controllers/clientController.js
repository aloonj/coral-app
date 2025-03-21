import { validationResult } from 'express-validator';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { Order } from '../models/Order.js';
import { sequelize, Op } from '../config/database.js';
import bcrypt from 'bcrypt';
import NotificationService from '../services/notificationService.js';
import BackupService from '../services/backupService.js';

export const updateClient = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array();
      const errorMessages = validationErrors.map(error => error.msg);
      await t.rollback();
      return res.status(400).json({ 
        message: errorMessages.join(', '),
        errors: validationErrors 
      });
    }

    const { id } = req.params;
    const { name, phone, address, email, discountRate } = req.body;

    // Find the client using findByPk which is safe from SQL injection
    const client = await Client.findByPk(id, { transaction: t });
    if (!client) {
      await t.rollback();
      return res.status(404).json({ message: 'Client not found' });
    }

    // If email is being updated, update the associated user account first
    if (email && email !== client.email) {
      const user = await User.findOne({ 
        where: { email: client.email },
        transaction: t 
      });
      
      if (!user) {
        await t.rollback();
        return res.status(404).json({ message: 'Associated user account not found' });
      }

      await user.update({ email }, { transaction: t });
    }

    // Update client details
    await client.update({ 
      name, 
      phone, 
      address, 
      email,
      ...(discountRate !== undefined && { discountRate })
    }, { transaction: t });

    await t.commit();
    
    // Return updated client
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Error updating client' });
  }
};

export const regeneratePassword = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    
    // Find the client using findByPk
    const client = await Client.findByPk(id, { transaction: t });
    if (!client) {
      await t.rollback();
      return res.status(404).json({ message: 'Client not found' });
    }

    // Find associated user account using parameterized query
    const user = await User.findOne({ 
      where: { email: client.email },
      transaction: t 
    });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'User account not found' });
    }

    // Generate new temporary password that meets requirements
    const generateValidPassword = () => {
      const symbols = '!@#$%^&*(),.?":{}|<>';
      const numbers = '0123456789';
      const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      // Ensure one of each required character type
      const password = [
        symbols[Math.floor(Math.random() * symbols.length)],
        numbers[Math.floor(Math.random() * numbers.length)],
        ...Array(6).fill().map(() => letters[Math.floor(Math.random() * letters.length)])
      ];
      
      // Shuffle the array
      return password.sort(() => Math.random() - 0.5).join('');
    };

    const tempPassword = generateValidPassword();
    
    // Update user's password
    user.password = tempPassword;
    try {
      await user.save({ transaction: t });
      await t.commit();
      
      // Send temporary password email
      await NotificationService.sendTemporaryPasswordEmail(user, tempPassword);
      
      // Return the new temporary password
      res.json({ temporaryPassword: tempPassword });
    } catch (validationError) {
      await t.rollback();
      if (validationError.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          message: 'Password validation failed',
          errors: validationError.errors.map(err => err.message)
        });
      }
      throw validationError;
    }
  } catch (error) {
    await t.rollback();
    console.error('Error regenerating password:', error);
    res.status(500).json({ message: 'Error regenerating password' });
  }
};

export const getClients = async (req, res) => {
  try {
    // Using Sequelize's built-in methods which are safe from SQL injection
    const clients = await Client.findAll({
      attributes: {
        include: [
          [
            sequelize.fn('COUNT', sequelize.col('orders.id')),
            'orderCount'
          ]
        ]
      },
      include: [
        {
          model: Order,
          as: 'orders',
          attributes: [],
          required: false
        },
        {
          model: User,
          as: 'user',
          attributes: ['status'],
          required: false
        }
      ],
      group: ['Client.id', 'Client.email', 'Client.name', 'Client.phone', 'Client.address', 'user.id', 'user.status'],
      order: [['createdAt', 'DESC']]
    });

    // Format the response to include user status
    const formattedClients = clients.map(client => {
      const clientJson = client.toJSON();
      return {
        ...clientJson,
        status: clientJson.user ? clientJson.user.status : null,
        user: undefined // Remove the nested user object
      };
    });

    res.json(formattedClients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Error fetching clients' });
  }
};

export const getClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Using findByPk instead of findOne for better security
    const client = await Client.findByPk(req.params.id, {
      attributes: {
        include: [
          [
            sequelize.fn('COUNT', sequelize.col('orders.id')),
            'orderCount'
          ]
        ]
      },
      include: [
        {
          model: Order,
          as: 'orders',
          attributes: [],
          required: false
        }
      ],
      group: ['Client.id', 'Client.email', 'Client.name', 'Client.phone', 'Client.address']
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Error fetching client' });
  }
};

export const createClient = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, name, phone, address, discountRate } = req.body;

    // Check if client or user already exists using Promise.all for parallel queries
    const [existingClient, existingUser] = await Promise.all([
      Client.findOne({ 
        where: { email },
        transaction: t 
      }),
      User.findOne({ 
        where: { email },
        transaction: t 
      })
    ]);
    
    if (existingClient || existingUser) {
      await t.rollback();
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate a valid password for the user
    const generateValidPassword = () => {
      const symbols = '!@#$%^&*(),.?":{}|<>';
      const numbers = '0123456789';
      const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      // Ensure one of each required character type
      const password = [
        symbols[Math.floor(Math.random() * symbols.length)],
        numbers[Math.floor(Math.random() * numbers.length)],
        ...Array(6).fill().map(() => letters[Math.floor(Math.random() * letters.length)])
      ];
      
      // Shuffle the array
      return password.sort(() => Math.random() - 0.5).join('');
    };

    const tempPassword = generateValidPassword();
    
    // Create new user account using Sequelize's create method which is parameterized
    try {
      // When an admin creates a client, set status to ACTIVE directly
      // This skips the approval step since the admin is creating the client
      const user = await User.create({
        email,
        password: tempPassword,
        name,
        role: 'CLIENT',
        status: 'ACTIVE', // Set to ACTIVE when created by admin
        userId: req.user?.id // Link to the admin who created the client if applicable
      }, { transaction: t });

      // Create new client
      const client = await Client.create({
        email,
        name,
        phone,
        address,
        discountRate: discountRate || 0,
        userId: user.id // Link to the user account
      }, { transaction: t });

      await t.commit();

      // Send temporary password email
      await NotificationService.sendTemporaryPasswordEmail(user, tempPassword);

      // Skip sending notification to admins since they created the client
      // No need to notify admins about something they just did

      // Include the temporary password in the response
      res.status(201).json({
        ...client.toJSON(),
        temporaryPassword: tempPassword
      });
    } catch (validationError) {
      await t.rollback();
      if (validationError.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          message: 'Password validation failed',
          errors: validationError.errors.map(err => err.message)
        });
      }
      throw validationError;
    }
  } catch (error) {
    await t.rollback();
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Error creating client' });
  }
};

export const approveClient = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    
    // Find the client using findByPk
    const client = await Client.findByPk(id, { transaction: t });
    if (!client) {
      await t.rollback();
      return res.status(404).json({ message: 'Client not found' });
    }

    // Find associated user account
    const user = await User.findOne({ 
      where: { email: client.email },
      transaction: t 
    });
    
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'User account not found' });
    }

    // Check if user is already active
    if (user.status === 'ACTIVE') {
      await t.rollback();
      return res.status(400).json({ message: 'Client is already approved' });
    }

    // Update user status to ACTIVE
    user.status = 'ACTIVE';
    await user.save({ transaction: t });
    
    await t.commit();
    
    // Send notification email to client
    try {
      await NotificationService.sendAccountApprovedEmail(user);
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
      // Continue even if email fails
    }
    
    res.json({ 
      message: 'Client approved successfully',
      client: {
        id: client.id,
        email: client.email,
        name: client.name
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Error approving client:', error);
    res.status(500).json({ message: 'Error approving client' });
  }
};

export const removeClient = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Check if client exists and has any non-archived orders
    const client = await Client.findByPk(id, {
      include: [{
        model: Order,
        as: 'orders',
        where: {
          archived: false
        },
        required: false
      }]
    });

    if (!client) {
      await t.rollback();
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check for any non-archived orders
    if (client.orders && client.orders.length > 0) {
      await t.rollback();
      return res.status(400).json({ 
        message: 'Cannot remove client with active orders. Please archive all orders first.',
        orderCount: client.orders.length
      });
    }

    // Delete associated user first
    await User.destroy({ 
      where: { email: client.email },
      transaction: t 
    });

    // Then delete the client
    await client.destroy({ transaction: t });
    
    await t.commit();
    res.json({ message: 'Client and associated user account removed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error removing client:', error);
    res.status(500).json({ message: 'Error removing client' });
  }
};

// Get count of pending client registrations
export const getPendingRegistrationsCount = async (req, res) => {
  try {
    // Count clients created in the last 24 hours
    const count = await Client.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching pending registrations count:', error);
    res.status(500).json({ message: 'Error fetching pending registrations count' });
  }
};

// Get count of pending client approvals
export const getPendingApprovalsCount = async (req, res) => {
  try {
    const count = await User.count({
      where: {
        role: 'CLIENT',
        status: 'INACTIVE'
      }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching pending approvals count:', error);
    res.status(500).json({ message: 'Error fetching pending approvals count' });
  }
};

// Get client profile for the authenticated user
export const getClientProfile = async (req, res) => {
  try {
    // Find client by email from the authenticated user
    const client = await Client.findOne({
      where: { email: req.user.email },
      attributes: ['id', 'name', 'email', 'phone', 'address', 'discountRate', 'createdAt', 'updatedAt']
    });

    if (!client) {
      return res.status(404).json({ message: 'Client profile not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error fetching client profile:', error);
    res.status(500).json({ message: 'Error fetching client profile' });
  }
};
