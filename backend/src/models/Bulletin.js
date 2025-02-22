import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import User from './User.js';

const Bulletin = sequelize.define('Bulletin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'NEWS',
      'ANNOUNCEMENT',
      'PROMOTION',
      'MAINTENANCE',
      'NEW_STOCK'
    ),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    defaultValue: 'LOW'
  },
  publishDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
    defaultValue: 'DRAFT'
  },
  sendNotification: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether to send notifications to clients'
  },
  notificationsSent: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of notification records with timestamp and recipient'
  },
  attachments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of attachment file paths'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true,
  hooks: {
    beforeValidate: (bulletin) => {
      // Ensure publishDate is not before current date for new bulletins
      if (!bulletin.id && bulletin.publishDate < new Date()) {
        bulletin.publishDate = new Date();
      }
      
      // Ensure expiryDate is after publishDate if set
      if (bulletin.expiryDate && bulletin.expiryDate <= bulletin.publishDate) {
        throw new Error('Expiry date must be after publish date');
      }
    }
  }
});

// Define association with User
Bulletin.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// Create a join table for tracking which users have read each bulletin
const BulletinRead = sequelize.define('BulletinRead', {
  readAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

// Many-to-Many relationship between Bulletin and User for read tracking
Bulletin.belongsToMany(User, {
  through: BulletinRead,
  as: 'readBy'
});

User.belongsToMany(Bulletin, {
  through: BulletinRead,
  as: 'readBulletins'
});

// Instance methods
Bulletin.prototype.markAsRead = async function(userId) {
  await BulletinRead.create({
    BulletinId: this.id,
    UserId: userId
  });
};

Bulletin.prototype.getReadStatus = async function(userId) {
  const read = await BulletinRead.findOne({
    where: {
      BulletinId: this.id,
      UserId: userId
    }
  });
  return !!read;
};

export { Bulletin, BulletinRead };
