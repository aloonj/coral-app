'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add userId column to clients table
    await queryInterface.addColumn('clients', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      unique: true
    });

    // Populate userId with existing id values for existing records
    await queryInterface.sequelize.query(`
      UPDATE clients
      SET userId = id
      WHERE userId IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove userId column from clients table
    await queryInterface.removeColumn('clients', 'userId');
  }
};
