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
      
      if (notification.type === 'STATUS_UPDATE') {
        // For status updates, always check for batching
        const isOldestInBatch = batchNotifications[0]?.id === notification.id;
        
        if (batchNotifications.length > 1) {
          if (isOldestInBatch) {
            console.log(`Processing batch of ${batchNotifications.length} notifications`);
            console.log('Notification IDs in batch:', batchNotifications.map(n => n.id).join(', '));
            
            // Get all unique statuses in order
            const statusChanges = batchNotifications
              .map(n => n.payload.statusAtQueue)
              .filter((status, index, array) => array.indexOf(status) === index);
            
            console.log(`Status progression: ${statusChanges.join(' -> ')}`);
            
            const orderData = order.toJSON();
            await NotificationService.processStatusNotification(
              orderData,
              order.client,
              {
                from: statusChanges[0],
                to: statusChanges[statusChanges.length - 1],
                steps: statusChanges.length,
                intermediateStatuses: statusChanges.slice(1, -1)
              }
            );
            
            // Mark all notifications in batch as completed at once
            console.log('Marking all notifications in batch as completed');
            await NotificationQueueService.markAsCompleted(
              batchNotifications.map(n => n.id)
            );
          } else {
            // If not the oldest, mark this notification as completed since it will be handled by the oldest
            console.log(`Notification ${notification.id} is part of a batch but not the oldest - marking as completed`);
            await NotificationQueueService.markAsCompleted(notification.id);
          }
          return;
        } else {
          // Process single notification (no batch)
          console.log(`Processing single notification for order #${order.id}`);
          const orderData = order.toJSON();
          await NotificationService.processStatusNotification(orderData, order.client);
          await NotificationQueueService.markAsCompleted(notification.id);
        }
      } else { // ORDER_CONFIRMATION
        // Process order confirmation immediately
        console.log(`Processing order confirmation for order #${order.id}`);
        const orderData = order.toJSON();
        await NotificationService.processOrderConfirmation(orderData, order.client);
        await NotificationQueueService.markAsCompleted(notification.id);
      }
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
      if (coral) {
        await NotificationService.processLowStockNotification(coral);
        await NotificationQueueService.markAsCompleted(notification.id);
      }
    } else if (notification.type === 'CLIENT_REGISTRATION') {
      console.log(`Processing client registration notification for client: ${notification.payload.clientData.name}`);
      const adminUsers = await User.findAll({
        where: { 
          role: ['ADMIN', 'SUPERADMIN'],
          status: 'ACTIVE'
        }
      });
      
      if (adminUsers.length > 0) {
        // Send individual emails to each admin
        for (const admin of adminUsers) {
          await NotificationService.processClientRegistrationNotification(
            notification.payload.clientData,
            admin
          );
        }
        await NotificationQueueService.markAsCompleted(notification.id);
      } else {
        console.log('No admin users found for client registration notification');
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
