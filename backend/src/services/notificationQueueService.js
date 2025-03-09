import NotificationQueue from '../models/NotificationQueue.js';
import { sequelize, Op } from '../config/database.js';

class NotificationQueueService {
  static async queueNotification(type, payload, options = {}) {
    try {
      return await NotificationQueue.create({
        type,
        payload,
        batchWindow: options.batchWindow || 300, // Default 5 minutes
        maxAttempts: options.maxAttempts || 3,
        nextAttempt: options.delay ? new Date(Date.now() + options.delay) : new Date()
      });
    } catch (error) {
      console.error('Error queueing notification:', error);
      throw error;
    }
  }

  static async findPendingNotifications() {
    const maxAttempts = NotificationQueue.getAttributes().maxAttempts.defaultValue;
    console.log(`Looking for notifications with status PENDING and attempts < ${maxAttempts}`);
    
    // First check if there are any notifications in the queue at all
    const totalCount = await NotificationQueue.count();
    console.log(`Total notifications in queue: ${totalCount}`);
    
    if (totalCount > 0) {
      // Log counts by status
      const statusCounts = await NotificationQueue.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status']
      });
      console.log('Notification counts by status:');
      statusCounts.forEach(stat => {
        console.log(`${stat.status}: ${stat.getDataValue('count')}`);
      });
    }
    
    const pendingNotifications = await NotificationQueue.findAll({
      where: {
        status: 'PENDING',
        attempts: { [Op.lt]: maxAttempts },
        [Op.or]: [
          { nextAttempt: null },
          { nextAttempt: { [Op.lte]: new Date() } }
        ]
      },
      order: [['createdAt', 'ASC']]
    });
    
    return pendingNotifications;
  }

  static async findBatchableNotifications(queueEntry) {
    if (queueEntry.type !== 'STATUS_UPDATE') return [];
    
    // First find all notifications in the time window (with microsecond precision)
    const startTime = new Date(queueEntry.createdAt.getTime() - queueEntry.batchWindow * 1000);
    const endTime = new Date(queueEntry.createdAt.getTime() + queueEntry.batchWindow * 1000);
    
    console.log(`Looking for notifications between ${startTime.toISOString()} and ${endTime.toISOString()}`);
    console.log(`Current notification created at: ${queueEntry.createdAt.toISOString()}`);
    
    const notifications = await NotificationQueue.findAll({
      where: {
        type: 'STATUS_UPDATE',
        createdAt: {
          [Op.between]: [startTime, endTime]
        },
        status: 'PENDING' // Only include pending notifications
      },
      order: [['createdAt', 'ASC']]
    });

    // Log found notifications with precise timestamps
    notifications.forEach(n => {
      console.log(`Found notification ${n.id} created at ${n.createdAt.toISOString()}`);
    });

    // Then filter for matching orderId
    console.log(`Found ${notifications.length} notifications in time window, filtering for orderId: ${queueEntry.payload.orderId}`);
    const matchingNotifications = notifications.filter(n => 
      n.payload && n.payload.orderId === queueEntry.payload.orderId
    );
    console.log(`Found ${matchingNotifications.length} matching notifications for this order`);
    
    return matchingNotifications;
  }

  static async markAsProcessing(queueEntry) {
    await queueEntry.update({
      status: 'PROCESSING',
      lastAttempt: new Date()
    });
  }

  static async markAsCompleted(queueEntryIds) {
    if (!Array.isArray(queueEntryIds)) {
      queueEntryIds = [queueEntryIds];
    }
    
    await NotificationQueue.update(
      {
        status: 'COMPLETED',
        processedAt: new Date()
      },
      {
        where: {
          id: queueEntryIds
        }
      }
    );
  }

  static async markAsFailed(queueEntry, error) {
    await queueEntry.update({
      status: 'FAILED',
      error: error.message,
      attempts: queueEntry.attempts + 1,
      lastAttempt: new Date(),
      nextAttempt: queueEntry.attempts < queueEntry.maxAttempts ? 
        new Date(Date.now() + Math.pow(2, queueEntry.attempts) * 1000) : null
    });
  }
}

export default NotificationQueueService;
