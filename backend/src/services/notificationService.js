import nodemailer from 'nodemailer';
import twilio from 'twilio';
import env from '../config/env.js';
import NotificationQueueService from './notificationQueueService.js';

// Email configuration
const emailTransporter = env.email.isConfigured
  ? nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: false,
      auth: {
        user: env.email.user,
        pass: env.email.pass
      }
    })
  : null;

// WhatsApp configuration (using Twilio)
const twilioClient = env.whatsapp.isConfigured && env.whatsapp.accountSid && env.whatsapp.authToken
  ? twilio(env.whatsapp.accountSid, env.whatsapp.authToken)
  : null;

class NotificationService {
  // Internal methods for actual sending
  static async _sendEmail(to, subject, html, options = { ccSender: true }) {
    if (!emailTransporter) {
      console.log(`[Email Disabled] Would have sent email from ${env.email.from} to ${to}${options.ccSender ? ` and cc ${env.email.from}` : ''}:`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${html.replace(/\n\s*/g, ' ').replace(/<[^>]*>/g, '')}`);
      return true;
    }
    try {
      const mailOptions = {
        from: env.email.from,
        to,
        subject,
        html
      };
      
      if (options.ccSender) {
        mailOptions.cc = env.email.from;
      }
      
      const info = await emailTransporter.sendMail(mailOptions);
      console.log(`Email sent from ${env.email.from} to ${to}`);
      console.log('Message ID:', info.messageId);
      console.log('Mail server response:', info.response);
      return true;
    } catch (error) {
      console.log('Email sending failed:', error.message);
      return true; // Return true to fail open
    }
  }

  static async _sendWhatsApp(to, message) {
    if (!twilioClient) {
      console.log('[WhatsApp Disabled] Would have sent message:');
      console.log(`To: ${to}`);
      console.log(`Content: ${message}`);
      return true;
    }
    try {
      const response = await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${env.whatsapp.number}`,
        to: `whatsapp:${to}`
      });
      console.log('WhatsApp message sent:', response.sid);
      return true;
    } catch (error) {
      console.log('WhatsApp message failed:', error.message);
      return true; // Return true to fail open
    }
  }

  // Process notifications from queue
  static async processOrderConfirmation(order, client) {
    const subject = 'Order Confirmation';
    const message = `Thank you for your order #${order.id}! Your order has been received and is being processed.`;
    const emailHtml = `
      <h2>Order Confirmation</h2>
      <p>${message}</p>
      <p>Order Details:</p>
      <ul>
        <li>Total Amount: $${order.totalAmount}</li>
        <li>Status: ${order.status}</li>
        ${order.preferredPickupDate ? `<li>Preferred Pickup Date: ${new Date(order.preferredPickupDate).toLocaleDateString()}</li>` : ''}
      </ul>
      <p>We'll notify you when your order status changes.</p>
    `;

    await Promise.all([
      this._sendEmail(client.email, subject, emailHtml),
      client.phone && this._sendWhatsApp(client.phone, message)
    ]);
  }

  static async processStatusNotification(order, client, statusHistory = null) {
    const subject = `Order #${order.id} Status Update for ${client.name}`;
    let message, emailHtml;
    
    if (statusHistory) {
      message = `Your order #${order.id} status changed from ${statusHistory.from} to ${statusHistory.to}`;
      emailHtml = `
        <h2>Order Status Update</h2>
        <p>Dear ${client.name},</p>
        <p>${message}</p>
        <p><small>(${statusHistory.steps} status changes were batched into this notification)</small></p>
        <h3>Order Summary:</h3>
        <ul>
          ${order.items?.map(item => `<li>${item.OrderItem.quantity}x ${item.speciesName}</li>`).join('\n          ') || 'No items found'}
        </ul>
        <p>Thanks,</p>
        <p>Fraggle Rock</p>
      `;
    } else {
      message = `Your order #${order.id} status has been updated to: ${order.status}`;
      emailHtml = `
        <h2>Order Status Update</h2>
        <p>Dear ${client.name},</p>
        <p>${message}</p>
        <h3>Order Summary:</h3>
        <ul>
          ${order.items?.map(item => `<li>${item.OrderItem.quantity}x ${item.speciesName}</li>`).join('\n          ') || 'No items found'}
        </ul>
        <p>Thanks,</p>
        <p>Fraggle Rock</p>
      `;
    }

    await Promise.all([
      this._sendEmail(client.email, subject, emailHtml),
      client.phone && this._sendWhatsApp(client.phone, message)
    ]);
  }

  static async processBulletinNotification(bulletin, users) {
    const subject = `${bulletin.priority} Bulletin: ${bulletin.title}`;
    const message = `${bulletin.title}\n\n${bulletin.content}`;
    const emailHtml = `
      <h2>${bulletin.title}</h2>
      <p>${bulletin.content}</p>
    `;

    await Promise.all(
      users.map(user => 
        Promise.all([
          this._sendEmail(user.email, subject, emailHtml),
          user.phone && this._sendWhatsApp(user.phone, message)
        ])
      )
    );
  }

  static async processLowStockNotification(coral) {
    const isOutOfStock = coral.quantity === 0;
    const subject = isOutOfStock ? 'URGENT: Out of Stock Alert' : 'Low Stock Alert';
    const message = isOutOfStock
      ? `URGENT: ${coral.speciesName} is now OUT OF STOCK (0 remaining)`
      : `Low stock alert for ${coral.speciesName}. Current quantity: ${coral.quantity} (Minimum: ${coral.minimumStock})`;
    const emailHtml = `
      <h2>${subject}</h2>
      <p>${message}</p>
    `;

    await this._sendEmail(env.email.from, subject, emailHtml);
  }

  static async sendTemporaryPasswordEmail(user, temporaryPassword) {
    const subject = 'Your Temporary Password';
    // Don't CC the sender for password reset emails
    const options = { ccSender: false };
    const emailHtml = `
      <h2>Temporary Password Reset</h2>
      <p>Dear ${user.name},</p>
      <p>Your password has been reset. Here is your temporary password:</p>
      <p style="font-family: monospace; font-size: 1.2em; padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;">
        ${temporaryPassword}
      </p>
      <p>Please log in with this temporary password and change it immediately for security purposes.</p>
      <p>Thanks,</p>
      <p>Fraggle Rock</p>
    `;

    await this._sendEmail(user.email, subject, emailHtml, options);
  }

  // Queue notifications
  static async queueOrderConfirmation(order) {
    await NotificationQueueService.queueNotification('ORDER_CONFIRMATION', {
      orderId: order.id,
      orderData: {
        totalAmount: order.totalAmount,
        status: order.status,
        preferredPickupDate: order.preferredPickupDate
      }
    });
  }

  static async queueOrderStatusUpdate(order) {
    await NotificationQueueService.queueNotification('STATUS_UPDATE', {
      orderId: order.id,
      statusAtQueue: order.status,
      orderData: {
        status: order.status
      }
    });
  }

  static async queueBulletinNotification(bulletin, users) {
    await NotificationQueueService.queueNotification('BULLETIN', {
      bulletinId: bulletin.id,
      bulletinData: {
        type: bulletin.type,
        title: bulletin.title,
        priority: bulletin.priority,
        content: bulletin.content
      }
    });
  }

  static async queueLowStockAlert(coral) {
    await NotificationQueueService.queueNotification('LOW_STOCK', {
      coralId: coral.id,
      coralData: {
        speciesName: coral.speciesName,
        quantity: coral.quantity,
        minimumStock: coral.minimumStock
      }
    });
  }
}

export default NotificationService;
