'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clients', 'discountRate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Percentage discount rate for client (e.g., 2.00, 5.00, 10.00)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('clients', 'discountRate');
  }
};
