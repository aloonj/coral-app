'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, update any existing backups with type 'full' or 'images' to 'database'
    await queryInterface.sequelize.query(`
      UPDATE backups 
      SET type = 'database' 
      WHERE type IN ('full', 'images')
    `);

    // Then modify the ENUM type
    // For MySQL, we need to change the column type
    await queryInterface.sequelize.query(`
      ALTER TABLE backups 
      MODIFY COLUMN type ENUM('database') NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert the ENUM type to include all original values
    await queryInterface.sequelize.query(`
      ALTER TABLE backups 
      MODIFY COLUMN type ENUM('full', 'database', 'images') NOT NULL
    `);
  }
};
