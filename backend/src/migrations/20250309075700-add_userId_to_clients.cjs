'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if userId column already exists
    const tableInfo = await queryInterface.describeTable('clients');
    
    // Step 1: Add userId column if it doesn't exist
    if (!tableInfo.userId) {
      await queryInterface.addColumn('clients', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        unique: true
      });
    }

    // Step 2: Populate userId only for clients that have corresponding users
    // Use INNER JOIN to only update clients with matching users
    await queryInterface.sequelize.query(`
      UPDATE clients c
      INNER JOIN Users u ON c.id = u.id
      SET c.userId = u.id
      WHERE c.userId IS NULL
    `);

    // Step 3: Check if foreign key constraint exists and add it if it doesn't
    try {
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
    } catch (error) {
      // If constraint already exists, log and continue
      console.log('Foreign key constraint may already exist:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove userId column from clients table
    await queryInterface.removeColumn('clients', 'userId');
  }
};
