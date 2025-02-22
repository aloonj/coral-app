import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Coral from './Coral.js';
import Client from './Client.js';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow null for archived orders
    references: {
      model: Client,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM(
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'READY_FOR_PICKUP',
      'COMPLETED',
      'CANCELLED'
    ),
    defaultValue: 'PENDING'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  preferredPickupDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notificationsSent: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of notification records with timestamp and type'
  },
  stockRestored: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indicates if stock has been restored after cancellation'
  },
  archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indicates if the completed order has been archived'
  },
  archivedClientData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Stores denormalized client data after archiving'
  },
  archivedItemsData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Stores denormalized order items data after archiving'
  },
  paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indicates if the order has been paid'
  }
});

// Order Items join table with additional fields
const OrderItem = sequelize.define('OrderItem', {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  priceAtOrder: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  }
});


// Define many-to-many relationship with Coral
Order.belongsToMany(Coral, {
  through: OrderItem,
  as: 'items'
});

Coral.belongsToMany(Order, {
  through: OrderItem,
  as: 'orders'
});

// Hooks
Order.addHook('beforeValidate', (order) => {
  // Initialize notifications if new order
  if (!order.notificationsSent) {
    order.notificationsSent = [{
      type: 'ORDER_CREATED',
      timestamp: new Date(),
      status: 'PENDING'
    }];
  }
  // Add status change notification if status changed
  else if (order.changed('status')) {
    const notifications = [...order.notificationsSent];
    notifications.push({
      type: 'STATUS_CHANGE',
      timestamp: new Date(),
      status: order.status
    });
    order.notificationsSent = notifications;
  }
});

export { Order, OrderItem };
