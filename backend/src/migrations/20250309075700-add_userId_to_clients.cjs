'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add userId column without foreign key constraint first
    await queryInterface.addColumn('clients', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      unique: true
    });

    // Step 2: Populate userId only for clients that have corresponding users
    await queryInterface.sequelize.query(`
      UPDATE clients c
      JOIN Users u ON c.id = u.id
      SET c.userId = u.id
      WHERE c.userId IS NULL
    `);

    // Step 3: Add foreign key constraint
    await queryInterface.addConstraint('clients', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'clients_userId_fk',
      references: {
        table: 'Users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove userId column from clients table
    await queryInterface.removeColumn('clients', 'userId');
  }
};
