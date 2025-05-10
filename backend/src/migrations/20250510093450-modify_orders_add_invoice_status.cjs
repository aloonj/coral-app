'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Check if 'paid' column exists before removing it
      const columns = await queryInterface.describeTable('Orders');
      if (columns.paid) {
        // Remove the existing 'paid' column
        await queryInterface.removeColumn('Orders', 'paid');
      }

      // Check if invoiceStatus column already exists
      if (!columns.invoiceStatus) {
        // Add the new 'invoiceStatus' column - MySQL ENUM
        await queryInterface.addColumn('Orders', 'invoiceStatus', {
          type: Sequelize.ENUM('INVOICE_PENDING', 'INVOICED'),
          defaultValue: 'INVOICE_PENDING',
          allowNull: false,
          comment: 'Indicates if the order has been invoiced in Xero'
        });
      }

      // Check if xeroInvoiceId column already exists
      if (!columns.xeroInvoiceId) {
        // Add an optional column to store Xero invoice ID for reference
        await queryInterface.addColumn('Orders', 'xeroInvoiceId', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'The ID of the invoice in Xero'
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      // Remove the new columns
      await queryInterface.removeColumn('Orders', 'xeroInvoiceId').catch(error => {
        console.log('Remove xeroInvoiceId error (may not exist):', error.message);
      });

      await queryInterface.removeColumn('Orders', 'invoiceStatus').catch(error => {
        console.log('Remove invoiceStatus error (may not exist):', error.message);
      });

      // Add back the original 'paid' column if it doesn't exist
      const columns = await queryInterface.describeTable('Orders');
      if (!columns.paid) {
        await queryInterface.addColumn('Orders', 'paid', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Indicates if the order has been paid'
        });
      }
    } catch (error) {
      console.error('Migration down error:', error);
      throw error;
    }
  }
};
