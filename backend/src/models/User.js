import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcrypt';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  authProvider: {
    type: DataTypes.ENUM('local', 'google'),
    defaultValue: 'local'
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true,
      async isUnique(value) {
        const currentId = this.id;

        console.log('User email uniqueness check:', {
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

          console.log('User query conditions:', JSON.stringify(query, null, 2));

          const existingUser = await User.findOne(query);

          console.log('Existing user found:', existingUser ? {
            id: existingUser.id,
            email: existingUser.email
          } : 'None');

          if (existingUser) {
            throw new Error('Email address already registered');
          }
        } catch (error) {
          console.error('User email uniqueness validation error:', {
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
  password: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for Google auth users
    validate: {
      isStrongPassword(value) {
        // Skip validation if using Google auth
        if (this.authProvider === 'google') return;
        
        // Skip validation if value is null (should only happen for Google auth)
        if (!value) return;
        
        const minLength = 8;
        const hasNumber = /\d/.test(value);
        const hasSymbol = /[!@#$%^&*(),.?":{}|<>_-]/.test(value);
        
        if (value.length < minLength) {
          throw new Error('Password must be at least 8 characters long');
        }
        if (!hasNumber) {
          throw new Error('Password must contain at least one number');
        }
        if (!hasSymbol) {
          throw new Error('Password must contain at least one symbol');
        }
      }
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('SUPERADMIN', 'ADMIN', 'CLIENT'),
    defaultValue: 'CLIENT'
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
    defaultValue: 'ACTIVE'
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// Instance method to check password
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

export default User;
