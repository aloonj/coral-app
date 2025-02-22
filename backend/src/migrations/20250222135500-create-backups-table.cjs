'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('backups', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      type: {
        type: Sequelize.ENUM('full', 'database', 'images'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'success', 'failed'),
        defaultValue: 'pending',
        allowNull: false
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Size in bytes'
      },
      path: {
        type: Sequelize.STRING,
        allowNull: true
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      completedAt: {
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
    await queryInterface.dropTable('backups');
  }
};
