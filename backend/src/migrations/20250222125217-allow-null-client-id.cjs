/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Get the foreign key constraint name
    const [results] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'coral_management'
        AND TABLE_NAME = 'Orders'
        AND COLUMN_NAME = 'clientId'
        AND REFERENCED_TABLE_NAME = 'clients';
    `);
    
    const constraintName = results[0]?.CONSTRAINT_NAME;
    
    if (constraintName) {
      // Remove the existing foreign key constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE Orders
        DROP FOREIGN KEY ${constraintName};
      `);
    }
    
    // Modify the column to allow null
    await queryInterface.sequelize.query(`
      ALTER TABLE Orders
      MODIFY COLUMN clientId INTEGER NULL,
      ADD CONSTRAINT fk_orders_client
      FOREIGN KEY (clientId) REFERENCES clients(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
    `);
  },

  async down (queryInterface, Sequelize) {
    // Remove the foreign key constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE Orders
      DROP FOREIGN KEY fk_orders_client;
    `);
    
    // Modify the column back to not null and add back the foreign key
    await queryInterface.sequelize.query(`
      ALTER TABLE Orders
      MODIFY COLUMN clientId INTEGER NOT NULL,
      ADD CONSTRAINT fk_orders_client
      FOREIGN KEY (clientId) REFERENCES clients(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
    `);
  }
};
