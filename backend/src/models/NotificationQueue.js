import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class NotificationQueue extends Model {}

NotificationQueue.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('ORDER_CONFIRMATION', 'STATUS_UPDATE', 'BULLETIN', 'LOW_STOCK'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'),
      defaultValue: 'PENDING',
      allowNull: false
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      allowNull: false
    },
    lastAttempt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextAttempt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    batchWindow: {
      type: DataTypes.INTEGER,
      defaultValue: 300, // 5 minutes in seconds
      allowNull: false
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'NotificationQueue',
    tableName: 'notification_queue',
    timestamps: true
  }
);

export default NotificationQueue;
