import { validationResult } from 'express-validator';
import { Order, OrderItem } from '../models/Order.js';
import Coral from '../models/Coral.js';
import Client from '../models/Client.js';
import NotificationService from '../services/notificationService.js';
import { sequelize } from '../config/database.js';

export const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, preferredPickupDate, notes, clientId } = req.body;

    // Get client information for discount rate
    let clientRecord;
    let clientDiscountRate = 0;

    // For admin/superadmin users, validate client exists
    if (['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      if (!clientId) {
        return res.status(400).json({
          message: 'Client ID is required for admin orders'
        });
      }
      clientRecord = await Client.findByPk(clientId);
      if (!clientRecord) {
        return res.status(404).json({
          message: 'Client not found'
        });
      }
      clientDiscountRate = parseFloat(clientRecord.discountRate) || 0;
    } else {
      // For client users, find their client record
      clientRecord = await Client.findOne({ where: { email: req.user.email } });
      if (!clientRecord) {
        return res.status(404).json({
          message: 'Client record not found'
        });
      }
      clientDiscountRate = parseFloat(clientRecord.discountRate) || 0;
    }

    // Pre-fetch all corals to validate availability
    const coralIds = items.map(item => item.coralId);
    const corals = await Coral.findAll({
      where: { id: coralIds }
    });

    if (corals.length !== items.length) {
      return res.status(404).json({
        message: 'One or more corals not found'
      });
    }

    // Validate stock and prepare data
    let totalAmount = 0;
    const orderItems = [];
    const stockUpdates = [];

    for (const item of items) {
      const coral = corals.find(c => c.id === item.coralId);
      
      if (coral.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${coral.speciesName}`
        });
      }

      // Calculate price with discount
      const originalPrice = parseFloat(coral.price);
      const discountedPrice = clientDiscountRate > 0 
        ? originalPrice * (1 - (clientDiscountRate / 100))
        : originalPrice;
      
      // Round to 2 decimal places
      const finalPrice = Math.round(discountedPrice * 100) / 100;
      
      // Verify submitted price if provided
      if (item.priceAtOrder !== undefined && 
          Math.abs(parseFloat(item.priceAtOrder) - finalPrice) > 0.01) {
        return res.status(400).json({
          message: `Invalid price submitted for ${coral.speciesName}`
        });
      }

      const subtotal = finalPrice * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        quantity: item.quantity,
        priceAtOrder: finalPrice,
        subtotal,
        CoralId: item.coralId
      });

      stockUpdates.push({
        id: coral.id,
        quantity: coral.quantity - item.quantity,
        minimumStock: coral.minimumStock
      });
    }

    // Execute database operations in transaction
    const order = await sequelize.transaction(async (transaction) => {
      // Get client ID
      let orderClientId;
      if (['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
        orderClientId = clientId;
      } else {
        // We already have the client record from above, no need to query again
        orderClientId = clientRecord.id;
      }
      
      const newOrder = await Order.create({
        clientId: orderClientId,
        totalAmount,
        preferredPickupDate,
        notes
      }, { transaction });

      // Create order items and update stock in parallel
      await Promise.all([
        // Create all order items
        OrderItem.bulkCreate(
          orderItems.map(item => ({
            ...item,
            OrderId: newOrder.id
          })),
          { transaction }
        ),
        // Update all coral quantities
        ...stockUpdates.map(update =>
          Coral.update(
            { quantity: update.quantity },
            { 
              where: { id: update.id },
              transaction,
              individualHooks: true
            }
          )
        )
      ]);

      return newOrder;
    });

    // Post-transaction operations
    const [completeOrder, client] = await Promise.all([
      // Fetch complete order with items
      Order.findByPk(order.id, {
        include: [{
          model: Coral,
          as: 'items',
          through: { attributes: ['quantity', 'priceAtOrder', 'subtotal'] }
        }]
      }),
      // Fetch client for notifications
      Client.findByPk(order.clientId)
    ]);

    // Send notifications asynchronously
    Promise.all([
      NotificationService.queueOrderConfirmation(order),
      // Check and send low stock alerts
      (async () => {
        const lowStockCorals = stockUpdates.filter(update => 
          update.quantity <= update.minimumStock
        );
        
        if (lowStockCorals.length > 0) {
          await Promise.all(
            lowStockCorals.map(async update => {
              const coral = await Coral.findByPk(update.id);
              return NotificationService.queueLowStockAlert(coral);
            })
          );
        }
      })()
    ]).catch(error => {
      console.error('Notification error:', error);
      // Don't fail the request for notification errors
    });

    res.status(201).json(completeOrder);
  } catch (error) {
    console.error('Create order error:', error);
    if (error.name === 'SequelizeConnectionAcquireTimeoutError') {
      return res.status(503).json({ 
        message: 'Service temporarily unavailable, please try again' 
      });
    }
    if (error.name === 'SequelizeLockTimeoutError' || error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      return res.status(409).json({ 
        message: 'Transaction conflict, please try again' 
      });
    }
    res.status(500).json({ message: 'Error creating order' });
  }
};

export const getOrders = async (req, res) => {
  try {
    let where = {};
    const { includeArchived = 'true' } = req.query;
    
    // For client users, find their client record and use that ID
    if (req.user.role === 'CLIENT') {
      const client = await Client.findOne({ where: { email: req.user.email } });
      if (client) {
        where.clientId = client.id;
      }
    }

    // Only include non-archived orders if includeArchived is false
    if (includeArchived !== 'true') {
      where.archived = false;
    }
    
    const orders = await Order.findAll({
      where,
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Coral,
          as: 'items',
          through: { attributes: ['quantity', 'priceAtOrder', 'subtotal'] }
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Transform orders to include archived data
    const transformedOrders = orders.map(order => {
      const orderData = order.toJSON();
      
      if (orderData.archived) {
        // Use archived data for client and items
        orderData.client = orderData.archivedClientData;
        orderData.items = orderData.archivedItemsData;
      }
      
      return orderData;
    });

    res.json(transformedOrders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Coral,
          as: 'items',
          through: { attributes: ['quantity', 'priceAtOrder', 'subtotal'] }
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // For archived orders, check authorization against archived client data
    if (!['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      const client = await Client.findOne({ where: { email: req.user.email } });
      if (!client || (order.clientId !== client.id && order.archivedClientData?.id !== client.id)) {
        return res.status(403).json({ message: 'Not authorized to view this order' });
      }
    }

    // Transform order to use archived data if needed
    const orderData = order.toJSON();
    if (orderData.archived) {
      orderData.client = orderData.archivedClientData;
      orderData.items = orderData.archivedItemsData;
    }

    res.json(orderData);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
};

export const markOrderAsPaid = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow marking as paid up to COMPLETED status
    if (!['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'COMPLETED'].includes(order.status)) {
      return res.status(400).json({
        message: 'Cannot mark order as paid in its current status'
      });
    }

    await order.update({ paid: true });
    res.json(order);
  } catch (error) {
    console.error('Mark order as paid error:', error);
    res.status(500).json({ message: 'Error marking order as paid' });
  }
};

export const markOrderAsUnpaid = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.archived) {
      return res.status(400).json({
        message: 'Cannot modify payment status of archived orders'
      });
    }

    await order.update({ paid: false });
    res.json(order);
  } catch (error) {
    console.error('Mark order as unpaid error:', error);
    res.status(500).json({ message: 'Error marking order as unpaid' });
  }
};

export const archiveOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: Client,
          as: 'client'
        },
        {
          model: Coral,
          as: 'items',
          through: { attributes: ['quantity', 'priceAtOrder', 'subtotal'] }
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'COMPLETED') {
      return res.status(400).json({ 
        message: 'Only completed orders can be archived' 
      });
    }

    if (!order.paid) {
      return res.status(400).json({
        message: 'Cannot archive unpaid orders'
      });
    }

    // Prepare denormalized data
    const clientData = {
      id: order.client.id,
      name: order.client.name,
      email: order.client.email,
      phone: order.client.phone,
      address: order.client.address
    };

    const itemsData = order.items.map(item => ({
      id: item.id,
      speciesName: item.speciesName,
      scientificName: item.scientificName,
      OrderItem: {
        quantity: item.OrderItem.quantity,
        priceAtOrder: item.OrderItem.priceAtOrder,
        subtotal: item.OrderItem.subtotal
      }
    }));

    // Update order with denormalized data and remove relationships
    await sequelize.transaction(async (t) => {
      // Store denormalized data and remove client relationship
      await order.update({
        archived: true,
        archivedClientData: clientData,
        archivedItemsData: itemsData,
        clientId: null
      }, { transaction: t });

      // Remove OrderItem associations
      await OrderItem.destroy({
        where: { OrderId: order.id },
        transaction: t
      });
    });

    res.json({
      ...order.toJSON(),
      client: clientData,
      items: itemsData
    });
  } catch (error) {
    console.error('Archive order error:', error);
    res.status(500).json({ message: 'Error archiving order' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: Client,
          as: 'client'
        },
        {
          model: Coral,
          as: 'items',
          through: { 
            model: OrderItem,
            attributes: ['quantity', 'priceAtOrder', 'subtotal']
          }
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Prevent changes to cancelled or archived orders
    if (order.status === 'CANCELLED' || order.archived) {
      return res.status(400).json({ 
        message: order.archived 
          ? 'Cannot modify archived orders'
          : 'Cannot change status of cancelled orders. Only deletion is allowed.'
      });
    }

    // If status is being changed to CANCELLED, restore stock
    if (status === 'CANCELLED' && ['PENDING', 'CONFIRMED'].includes(order.status)) {
      // Prepare stock updates - restore the ordered quantities back to stock
      const stockUpdates = order.items.map(coral => {
        const currentStock = coral.quantity;
        const orderedQuantity = coral.OrderItem.quantity;
        return {
          id: coral.id,
          quantity: currentStock + orderedQuantity // Restore the ordered quantity back to stock
        };
      });

      // Execute updates in transaction
      await sequelize.transaction(async (transaction) => {
        // Update all coral quantities in parallel
        await Promise.all([
          ...stockUpdates.map(update => 
            Coral.update(
              { quantity: update.quantity },
              { 
                where: { id: update.id },
                transaction,
                individualHooks: true
              }
            )
          ),
          // Update order status and mark stock as restored
          order.update({ 
            status,
            stockRestored: true 
          }, { transaction })
        ]);
      });
    } else {
      // For non-cancellation status updates
      await order.update({ status });
    }

    // Send notification
    await NotificationService.queueOrderStatusUpdate(order);

    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    // Pre-fetch order with items and their ordered quantities
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: Coral,
          as: 'items',
          through: { 
            model: OrderItem,
            attributes: ['quantity', 'priceAtOrder', 'subtotal']
          }
        },
        {
          model: Client,
          as: 'client'
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has permission to cancel this order
    if (!['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      const client = await Client.findOne({ where: { email: req.user.email } });
      if (!client || order.clientId !== client.id) {
        return res.status(403).json({ message: 'Not authorized to cancel this order' });
      }
    }

    // Check if order can be cancelled
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled in its current status' 
      });
    }

    // Prepare stock updates - restore the ordered quantities back to stock
    const stockUpdates = order.items.map(coral => {
      const currentStock = coral.quantity;
      const orderedQuantity = coral.OrderItem.quantity;
      return {
        id: coral.id,
        quantity: currentStock + orderedQuantity // Restore the ordered quantity back to stock
      };
    });

    // Execute cancellation in transaction
    await sequelize.transaction(async (transaction) => {
      // Update all coral quantities in parallel
      await Promise.all([
        ...stockUpdates.map(update => 
          Coral.update(
            { quantity: update.quantity },
            { 
              where: { id: update.id },
              transaction,
              individualHooks: true
            }
          )
        ),
        // Update order status and mark stock as restored
        order.update({ 
          status: 'CANCELLED',
          stockRestored: true 
        }, { transaction })
      ]);
    });

    // Send cancellation notification asynchronously
    NotificationService.queueOrderStatusUpdate(order)
      .catch(error => {
        console.error('Notification error:', error);
        // Don't fail the request for notification errors
      });

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel order error:', error);
    if (error.name === 'SequelizeConnectionAcquireTimeoutError') {
      return res.status(503).json({ 
        message: 'Service temporarily unavailable, please try again' 
      });
    }
    if (error.name === 'SequelizeLockTimeoutError' || error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      return res.status(409).json({ 
        message: 'Transaction conflict, please try again' 
      });
    }
    res.status(500).json({ message: 'Error cancelling order' });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    // Fetch order with items to handle stock restoration if needed
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: Client,
          as: 'client'
        },
        {
          model: Coral,
          as: 'items',
          through: { 
            model: OrderItem,
            attributes: ['quantity', 'priceAtOrder', 'subtotal']
          }
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow deletion of cancelled or completed orders
    if (!['CANCELLED', 'COMPLETED'].includes(order.status)) {
      return res.status(400).json({ 
        message: 'Only cancelled or completed orders can be deleted' 
      });
    }

    // For completed orders - stock stays deducted since items were sold
    // For cancelled orders - only restore stock if it wasn't already restored
    if (order.status === 'CANCELLED' && !order.stockRestored) {
      // Prepare stock updates - restore the ordered quantities back to stock
      const stockUpdates = order.items.map(coral => {
        const currentStock = coral.quantity;
        const orderedQuantity = coral.OrderItem.quantity;
        return {
          id: coral.id,
          quantity: currentStock + orderedQuantity // Restore the ordered quantity back to stock
        };
      });

      // Execute deletion and stock updates in transaction
      await sequelize.transaction(async (transaction) => {
        // Update all coral quantities in parallel
        await Promise.all([
          ...stockUpdates.map(update => 
            Coral.update(
              { quantity: update.quantity },
              { 
              where: { id: update.id },
              transaction,
              individualHooks: true
              }
            )
          )
        ]);
        
        // Delete the order
        await order.destroy({ transaction });
      });
    } else {
      // For completed orders, just delete without stock changes
      await order.destroy();
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Error deleting order' });
  }
};

export const purgeArchivedOrders = async (req, res) => {
  try {
    // Delete all archived orders
    const result = await Order.destroy({
      where: { archived: true }
    });

    res.json({ 
      message: 'Archived orders purged successfully',
      count: result
    });
  } catch (error) {
    console.error('Purge archived orders error:', error);
    res.status(500).json({ message: 'Error purging archived orders' });
  }
};
