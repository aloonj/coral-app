import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class Client extends Model {}

Client.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
      async isUnique(value) {
        const currentId = this.id;

        console.log('Email uniqueness check:', {
          checkingEmail: value,
          currentRecordId: currentId,
          isUpdate: !!currentId
        });

        try {
          const query = {
            where: sequelize.where(
              sequelize.fn('LOWER', sequelize.col('email')),
              '=',
              sequelize.fn('LOWER', value)
            )
          };

          // If this is an update operation, exclude the current record
          if (currentId) {
            query.where = {
              [sequelize.Sequelize.Op.and]: [
                query.where,
                {
                  id: { [sequelize.Sequelize.Op.ne]: currentId }
                }
              ]
            };
          }

          console.log('Query conditions:', JSON.stringify(query, null, 2));

          const existingClient = await Client.findOne(query);

          console.log('Existing client found:', existingClient ? {
            id: existingClient.id,
            email: existingClient.email
          } : 'None');

          if (existingClient) {
            throw new Error('Email address already registered');
          }
        } catch (error) {
          console.error('Email uniqueness validation error:', {
            error: error.message,
            stack: error.stack,
            checkingEmail: value,
            currentRecordId: currentId
          });
          
          throw new Error(
            error.message === 'Email address already registered'
              ? error.message
              : 'Error checking email uniqueness'
          );
        }
      }
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Client',
  tableName: 'clients'
});

export default Client;
