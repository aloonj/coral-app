import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Backup = sequelize.define('Backup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('full', 'database', 'images'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'success', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Size in bytes'
  },
  path: {
    type: DataTypes.STRING,
    allowNull: true
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'backups',
  timestamps: true
});

export default Backup;
