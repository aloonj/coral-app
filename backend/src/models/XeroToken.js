import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class XeroToken extends Model {}

XeroToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tenantId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Xero tenant/organization ID',
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'OAuth access token',
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'OAuth refresh token',
    },
    idToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'OpenID Connect ID token',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Token expiration timestamp',
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'OAuth scopes',
    },
    tokenType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Bearer',
      comment: 'OAuth token type',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this is the active token set',
    },
  },
  {
    sequelize,
    modelName: 'XeroToken',
    tableName: 'xero_tokens',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['tenantId', 'active'],
        where: {
          active: true,
        },
        name: 'xero_tokens_tenant_active_idx',
      },
    ],
  }
);

export { XeroToken };
export default XeroToken;
