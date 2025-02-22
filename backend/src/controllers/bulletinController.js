import { validationResult } from 'express-validator';
import { Bulletin, BulletinRead } from '../models/Bulletin.js';
import User from '../models/User.js';
import NotificationService from '../services/notificationService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createBulletin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const bulletinData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Handle attachments
    if (req.files) {
      bulletinData.attachments = req.files.map(file => file.filename);
    }

    const bulletin = await Bulletin.create(bulletinData);

    // If bulletin is published and notifications are enabled, send notifications
    if (bulletin.status === 'PUBLISHED' && bulletin.sendNotification) {
      const clients = await User.findAll({
        where: { role: 'CLIENT', status: 'ACTIVE' }
      });
      await NotificationService.queueBulletinNotification(bulletin, clients);
    }

    res.status(201).json(bulletin);
  } catch (error) {
    console.error('Create bulletin error:', error);
    res.status(500).json({ message: 'Error creating bulletin' });
  }
};

export const getAllBulletins = async (req, res) => {
  try {
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
    const where = isAdmin ? {} : {
      status: 'PUBLISHED',
      publishDate: {
        [Op.lte]: new Date()
      },
      [Op.or]: [
        { expiryDate: null },
        { expiryDate: { [Op.gt]: new Date() } }
      ]
    };

    const bulletins = await Bulletin.findAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['publishDate', 'DESC']
      ]
    });

    // For clients, include read status
    if (!isAdmin) {
      for (const bulletin of bulletins) {
        bulletin.dataValues.isRead = await bulletin.getReadStatus(req.user.id);
      }
    }

    res.json(bulletins);
  } catch (error) {
    console.error('Get bulletins error:', error);
    res.status(500).json({ message: 'Error fetching bulletins' });
  }
};

export const getBulletinById = async (req, res) => {
  try {
    const bulletin = await Bulletin.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin not found' });
    }

    // Check access for non-admin users
    if (!['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      if (
        bulletin.status !== 'PUBLISHED' ||
        bulletin.publishDate > new Date() ||
        (bulletin.expiryDate && bulletin.expiryDate <= new Date())
      ) {
        return res.status(403).json({ message: 'Not authorized to view this bulletin' });
      }
    }

    // Mark as read for clients
    if (req.user.role === 'CLIENT') {
      await bulletin.markAsRead(req.user.id);
      bulletin.dataValues.isRead = true;
    }

    res.json(bulletin);
  } catch (error) {
    console.error('Get bulletin error:', error);
    res.status(500).json({ message: 'Error fetching bulletin' });
  }
};

export const updateBulletin = async (req, res) => {
  try {
    const bulletin = await Bulletin.findByPk(req.params.id);
    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin not found' });
    }

    const updateData = { ...req.body };

    // Handle attachments
    if (req.files && req.files.length > 0) {
      // Delete old attachments
      for (const attachment of bulletin.attachments) {
        const filePath = path.join(__dirname, '../../uploads', attachment);
        await fs.unlink(filePath).catch(err => 
          console.error('Error deleting old attachment:', err)
        );
      }
      updateData.attachments = req.files.map(file => file.filename);
    }

    const wasPublished = bulletin.status === 'PUBLISHED';
    await bulletin.update(updateData);

    // Send notifications if bulletin is newly published
    if (!wasPublished && 
        bulletin.status === 'PUBLISHED' && 
        bulletin.sendNotification) {
      const clients = await User.findAll({
        where: { role: 'CLIENT', status: 'ACTIVE' }
      });
      await NotificationService.queueBulletinNotification(bulletin, clients);
    }

    res.json(bulletin);
  } catch (error) {
    console.error('Update bulletin error:', error);
    res.status(500).json({ message: 'Error updating bulletin' });
  }
};

export const deleteBulletin = async (req, res) => {
  try {
    const bulletin = await Bulletin.findByPk(req.params.id);
    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin not found' });
    }

    // Delete attachments
    for (const attachment of bulletin.attachments) {
      const filePath = path.join(__dirname, '../../uploads', attachment);
      await fs.unlink(filePath).catch(err => 
        console.error('Error deleting attachment:', err)
      );
    }

    await bulletin.destroy();
    res.json({ message: 'Bulletin deleted successfully' });
  } catch (error) {
    console.error('Delete bulletin error:', error);
    res.status(500).json({ message: 'Error deleting bulletin' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Bulletin.count({
      where: {
        status: 'PUBLISHED',
        publishDate: {
          [Op.lte]: new Date()
        },
        [Op.or]: [
          { expiryDate: null },
          { expiryDate: { [Op.gt]: new Date() } }
        ]
      },
      include: [{
        model: User,
        as: 'readBy',
        where: { id: req.user.id },
        required: false
      }],
      having: sequelize.where(
        sequelize.fn('COUNT', sequelize.col('readBy.id')),
        '=',
        0
      )
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
};
