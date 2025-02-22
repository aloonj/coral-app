import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import NotificationQueue from '../models/NotificationQueue.js';
import NotificationService from '../services/notificationService.js';
import { Op } from 'sequelize';
import env from '../config/env.js';

const router = express.Router();

// Send test notification (admin only)
router.post('/test', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    if (!env.email.isConfigured) {
      return res.status(400).json({ message: 'Email is not configured' });
    }

    const subject = 'Test Notification';
    const html = `
      <h2>Test Notification</h2>
      <p>This is a test notification sent from the Coral App notification system.</p>
      <p>If you received this, the notification system is working correctly!</p>
      <p>Sent at: ${new Date().toLocaleString()}</p>
    `;

    await NotificationService._sendEmail(env.email.user, subject, html);
    res.json({ message: 'Test notification sent successfully' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: 'Error sending test notification' });
  }
});

// Get notification queue status (admin only)
router.get('/queue/status', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const [
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      recentFailures
    ] = await Promise.all([
      // Count pending notifications (only those not yet processed)
      NotificationQueue.count({
        where: { 
          status: 'PENDING',
          processedAt: null
        }
      }),
      // Count processing notifications (only those not yet processed)
      NotificationQueue.count({
        where: { 
          status: 'PROCESSING',
          processedAt: null
        }
      }),
      // Count completed notifications in last 24 hours
      NotificationQueue.count({
        where: {
          status: 'COMPLETED',
          processedAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Count failed notifications
      NotificationQueue.count({
        where: { status: 'FAILED' }
      }),
      // Get recent failures
      NotificationQueue.findAll({
        where: {
          status: 'FAILED',
          updatedAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        order: [['updatedAt', 'DESC']],
        limit: 10
      })
    ]);

    res.json({
      status: {
        pending: pendingCount,
        processing: processingCount,
        completed_24h: completedCount,
        failed: failedCount
      },
      recentFailures: recentFailures.map(failure => ({
        id: failure.id,
        type: failure.type,
        error: failure.error,
        attempts: failure.attempts,
        lastAttempt: failure.lastAttempt,
        createdAt: failure.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ message: 'Error fetching queue status' });
  }
});

// Retry failed notifications (admin only)
router.post('/queue/retry', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid request format' });
    }

    // Reset status and attempts for specified notifications
    await NotificationQueue.update(
      {
        status: 'PENDING',
        attempts: 0,
        error: null,
        lastAttempt: null,
        nextAttempt: new Date()
      },
      {
        where: {
          id: ids,
          status: 'FAILED'
        }
      }
    );

    res.json({ message: 'Notifications queued for retry' });
  } catch (error) {
    console.error('Error retrying notifications:', error);
    res.status(500).json({ message: 'Error retrying notifications' });
  }
});

// Clear completed notifications older than X days (admin only)
router.delete('/queue/cleanup', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days, 10);

    if (isNaN(daysNum) || daysNum < 1) {
      return res.status(400).json({ message: 'Invalid days parameter' });
    }

    const cutoffDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    // Clean up database entries
    const result = await NotificationQueue.destroy({
      where: {
        status: 'COMPLETED',
        processedAt: {
          [Op.lt]: cutoffDate
        }
      }
    });

    res.json({
      message: `Cleaned up ${result} completed notifications older than ${daysNum} days`
    });
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    res.status(500).json({ message: 'Error cleaning up notifications' });
  }
});

// Delete all notifications (admin only)
router.delete('/queue/all', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    // Clean up database entries
    const result = await NotificationQueue.destroy({
      where: {},
      truncate: true
    });

    res.json({
      message: `Successfully cleared all notifications`
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ 
      message: 'Error clearing notifications',
      error: error.message 
    });
  }
});

export default router;
