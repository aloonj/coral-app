'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add CLIENT_REGISTRATION to the type enum in notification_queue table
    await queryInterface.sequelize.query(`
      ALTER TABLE notification_queue 
      MODIFY COLUMN type ENUM('ORDER_CONFIRMATION', 'STATUS_UPDATE', 'BULLETIN', 'LOW_STOCK', 'CLIENT_REGISTRATION') NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert back to original enum without CLIENT_REGISTRATION
    await queryInterface.sequelize.query(`
      ALTER TABLE notification_queue 
      MODIFY COLUMN type ENUM('ORDER_CONFIRMATION', 'STATUS_UPDATE', 'BULLETIN', 'LOW_STOCK') NOT NULL
    `);
  }
};
