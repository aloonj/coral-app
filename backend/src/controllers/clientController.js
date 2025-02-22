import { validationResult } from 'express-validator';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { Order } from '../models/Order.js';
import { sequelize, Op } from '../config/database.js';
import bcrypt from 'bcrypt';
import NotificationService from '../services/notificationService.js';

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
    const { name, phone, address, email } = req.body;

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
    await client.update({ name, phone, address, email }, { transaction: t });

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
        }
      ],
      group: ['Client.id', 'Client.email', 'Client.name', 'Client.phone', 'Client.address'],
      order: [['createdAt', 'DESC']]
    });

    res.json(clients);
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

    const { email, name, phone, address } = req.body;

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
      const user = await User.create({
        email,
        password: tempPassword,
        name,
        role: 'CLIENT',
        status: 'ACTIVE'
      }, { transaction: t });

      // Create new client
      const client = await Client.create({
        email,
        name,
        phone,
        address
      }, { transaction: t });

      await t.commit();

      // Send temporary password email
      await NotificationService.sendTemporaryPasswordEmail(user, tempPassword);

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

export const removeClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Check if client exists using findByPk for better security
    const client = await Client.findByPk(id, {
      include: [{
        model: Order,
        as: 'orders',
        where: {
          status: {
            [Op.notIn]: ['COMPLETED', 'CANCELLED']
          }
        },
        required: false
      }]
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check for outstanding orders
    if (client.orders && client.orders.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot remove client with outstanding orders',
        orderCount: client.orders.length
      });
    }

    // Remove client using Sequelize's destroy method which is parameterized
    await client.destroy();
    res.json({ message: 'Client removed successfully' });
  } catch (error) {
    console.error('Error removing client:', error);
    res.status(500).json({ message: 'Error removing client' });
  }
};
