#!/usr/bin/env node
import '../config/env.js';
import NotificationQueueService from '../services/notificationQueueService.js';
import NotificationService from '../services/notificationService.js';
import { Order, User, Client, Coral } from '../models/associations.js';
import { Bulletin } from '../models/Bulletin.js';

console.log('Notification worker started');

let isRunning = true;

async function processNotification(notification) {
  try {
    console.log(`Processing notification ${notification.id} of type ${notification.type}`);
    await NotificationQueueService.markAsProcessing(notification);

    if (notification.type === 'STATUS_UPDATE' || notification.type === 'ORDER_CONFIRMATION') {
      // First verify the order exists and get associated client
      const order = await Order.findByPk(notification.payload.orderId, {
        include: [
          {
            model: Client,
            as: 'client'
          },
          {
            model: Coral,
            as: 'items',
            through: {
              attributes: ['quantity']
            }
          }
        ]
      });
      
      if (!order || !order.client) {
        console.log(`Order ${notification.payload.orderId} or associated client not found - skipping notification`);
        await NotificationQueueService.markAsCompleted(notification.id);
        return;
      }
      
      // Check for batchable notifications
      console.log(`Checking for batchable notifications for order #${order.id} (${notification.payload.orderId})`);
      const batchNotifications = await NotificationQueueService.findBatchableNotifications(notification);
      console.log(`Found ${batchNotifications.length} notifications for this order`);
      
      if (batchNotifications.length > 1) {
        console.log(`Processing batch of ${batchNotifications.length} notifications`);
        console.log('Notification IDs in batch:', batchNotifications.map(n => n.id).join(', '));
        
        // Find the oldest notification in the batch
        const oldestNotification = batchNotifications[0];
        console.log(`Oldest notification in batch: ${oldestNotification.id}`);
        
        if (oldestNotification.id === notification.id) {
          console.log('This is the oldest notification - processing entire batch');
          
          // Process batch
          const firstStatus = batchNotifications[0].payload.statusAtQueue;
          const lastStatus = batchNotifications[batchNotifications.length - 1].payload.statusAtQueue;

          console.log(`Processing status transition: ${firstStatus} -> ${lastStatus} (${batchNotifications.length} steps)`);

          const orderData = order.toJSON();
          await NotificationService.processStatusNotification(
            orderData,
            order.client,
            {
              from: firstStatus,
              to: lastStatus,
              steps: batchNotifications.length
            }
          );

          // Mark all notifications in batch as completed
          await NotificationQueueService.markAsCompleted(
            batchNotifications.map(n => n.id)
          );
        } else {
          console.log(`Notification ${notification.id} is newer - skipping as part of batch`);
          await NotificationQueueService.markAsCompleted(notification.id);
        }
        return;
      }

      // Process single notification
      console.log(`Processing single notification for order #${order.id}`);
      const orderData = order.toJSON();
      
      if (notification.type === 'STATUS_UPDATE') {
        await NotificationService.processStatusNotification(orderData, order.client);
      } else { // ORDER_CONFIRMATION
        await NotificationService.processOrderConfirmation(orderData, order.client);
      }
      
      await NotificationQueueService.markAsCompleted(notification.id);
    } else if (notification.type === 'BULLETIN') {
      const bulletin = await Bulletin.findByPk(notification.payload.bulletinId);
      const users = await User.findAll({
        where: { 
          role: 'CLIENT',
          status: 'ACTIVE'
        }
      });

      if (bulletin && users.length > 0) {
        await NotificationService.processBulletinNotification(bulletin, users);
        await NotificationQueueService.markAsCompleted(notification.id);
      }
    } else if (notification.type === 'LOW_STOCK') {
      const coral = await Coral.findByPk(notification.payload.coralId);
      const admin = await User.findOne({ where: { role: 'ADMIN' } });

      if (coral && admin) {
        await NotificationService.processLowStockNotification(coral, admin);
        await NotificationQueueService.markAsCompleted(notification.id);
      }
    } else {
      throw new Error(`Unknown notification type: ${notification.type}`);
    }
  } catch (error) {
    console.error(`Error processing notification ${notification.id}:`, error);
    await NotificationQueueService.markAsFailed(notification, error);
  }
}

async function processNotifications() {
  try {
    console.log('Checking for notifications to process...');
    const notifications = await NotificationQueueService.findPendingNotifications();
    console.log(`Found ${notifications.length} notifications to process`);

    for (const notification of notifications) {
      await processNotification(notification);
    }
  } catch (error) {
    console.error('Error in notification processing loop:', error);
  }

  // Schedule next run if still running
  if (isRunning) {
    setTimeout(processNotifications, 60000); // Run every minute
  }
}

// Start processing
processNotifications();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down notification worker...');
  isRunning = false;
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down notification worker...');
  isRunning = false;
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  isRunning = false;
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  isRunning = false;
  process.exit(1);
});
