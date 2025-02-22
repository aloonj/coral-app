'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Users table first as it's referenced by other tables
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('SUPERADMIN', 'ADMIN', 'CLIENT'),
        defaultValue: 'CLIENT'
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Categories table
    await queryInterface.createTable('Categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Clients table
    await queryInterface.createTable('clients', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Corals table
    await queryInterface.createTable('Corals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      speciesName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      scientificName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      careLevel: {
        type: Sequelize.ENUM('EASY', 'MODERATE', 'EXPERT'),
        allowNull: true
      },
      growthRate: {
        type: Sequelize.ENUM('SLOW', 'MODERATE', 'FAST'),
        allowNull: true
      },
      lightingRequirements: {
        type: Sequelize.STRING,
        allowNull: true
      },
      waterFlow: {
        type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH'),
        allowNull: true
      },
      temperature: {
        type: Sequelize.JSON,
        allowNull: true
      },
      pH: {
        type: Sequelize.JSON,
        allowNull: true
      },
      salinity: {
        type: Sequelize.JSON,
        allowNull: true
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Categories',
          key: 'id'
        },
        onDelete: 'RESTRICT'
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      minimumStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      status: {
        type: Sequelize.ENUM('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK'),
        defaultValue: 'OUT_OF_STOCK'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Orders table
    await queryInterface.createTable('Orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      clientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clients',
          key: 'id'
        }
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'),
        defaultValue: 'PENDING'
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      preferredPickupDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notificationsSent: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      stockRestored: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      archived: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      paid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create OrderItems table (junction table between Orders and Corals)
    await queryInterface.createTable('OrderItems', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      OrderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Orders',
          key: 'id'
        }
      },
      CoralId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Corals',
          key: 'id'
        }
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      priceAtOrder: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create unique constraint on OrderItems
    await queryInterface.addConstraint('OrderItems', {
      fields: ['OrderId', 'CoralId'],
      type: 'unique',
      name: 'OrderItems_OrderId_CoralId_unique'
    });

    // Create NotificationQueue table
    await queryInterface.createTable('notification_queue', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      type: {
        type: Sequelize.ENUM('ORDER_CONFIRMATION', 'STATUS_UPDATE', 'BULLETIN', 'LOW_STOCK'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'),
        defaultValue: 'PENDING',
        allowNull: false
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      maxAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
        allowNull: false
      },
      lastAttempt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      nextAttempt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      batchWindow: {
        type: Sequelize.INTEGER,
        defaultValue: 300,
        allowNull: false
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order to handle foreign key constraints
    await queryInterface.dropTable('notification_queue');
    await queryInterface.dropTable('OrderItems');
    await queryInterface.dropTable('Orders');
    await queryInterface.dropTable('Corals');
    await queryInterface.dropTable('clients');
    await queryInterface.dropTable('Categories');
    await queryInterface.dropTable('Users');
  }
};
