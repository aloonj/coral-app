'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if the table already exists
      const tables = await queryInterface.showAllTables();

      if (!tables.includes('xero_tokens')) {
        await queryInterface.createTable('xero_tokens', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          tenantId: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Xero tenant/organization ID',
          },
          accessToken: {
            type: Sequelize.TEXT,
            allowNull: false,
            comment: 'OAuth access token',
          },
          refreshToken: {
            type: Sequelize.TEXT,
            allowNull: false,
            comment: 'OAuth refresh token',
          },
          idToken: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'OpenID Connect ID token',
          },
          expiresAt: {
            type: Sequelize.DATE,
            allowNull: false,
            comment: 'Token expiration timestamp',
          },
          scope: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'OAuth scopes',
          },
          tokenType: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: 'Bearer',
            comment: 'OAuth token type',
          },
          active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether this is the active token set',
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
        });

        // Check for existing indexes first
        try {
          // Add index for active tenant tokens
          await queryInterface.addIndex('xero_tokens', ['tenantId', 'active'], {
            unique: true,
            name: 'xero_tokens_tenant_active_idx',
          });
        } catch (error) {
          // Index already exists, ignore error
          console.log('Index creation error (may already exist):', error.message);
        }
      } else {
        console.log('xero_tokens table already exists, skipping creation');
      }
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Only drop if the table exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('xero_tokens')) {
      await queryInterface.dropTable('xero_tokens');
    }
  },
};
