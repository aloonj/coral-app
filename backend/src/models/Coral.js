import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Coral = sequelize.define('Coral', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  speciesName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  scientificName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  careLevel: {
    type: DataTypes.ENUM('EASY', 'MODERATE', 'EXPERT'),
    allowNull: true
  },
  growthRate: {
    type: DataTypes.ENUM('SLOW', 'MODERATE', 'FAST'),
    allowNull: true
  },
  lightingRequirements: {
    type: DataTypes.STRING,
    allowNull: true
  },
  waterFlow: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    allowNull: true
  },
  temperature: {
    type: DataTypes.JSON, // Store min and max temperature
    allowNull: true
  },
  pH: {
    type: DataTypes.JSON, // Store min and max pH
    allowNull: true
  },
  salinity: {
    type: DataTypes.JSON, // Store min and max salinity
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Categories',
      key: 'id'
    },
    onDelete: 'RESTRICT'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  minimumStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK'),
    defaultValue: 'OUT_OF_STOCK'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'Corals',
  timestamps: true,
  hooks: {
    beforeValidate: (coral) => {
      // Ensure temperature, pH, and salinity are properly formatted
      const validateRange = (range) => {
        if (typeof range === 'string') {
          return JSON.parse(range);
        }
        return range;
      };

      if (coral.temperature) {
        coral.temperature = validateRange(coral.temperature);
      }
      if (coral.pH) {
        coral.pH = validateRange(coral.pH);
      }
      if (coral.salinity) {
        coral.salinity = validateRange(coral.salinity);
      }
    }
  }
});

// Hooks for managing stock status
Coral.addHook('beforeSave', (coral) => {
  if (coral.quantity === 0) {
    coral.status = 'OUT_OF_STOCK';
  } else if (coral.quantity <= coral.minimumStock) {
    coral.status = 'LOW_STOCK';
  } else {
    coral.status = 'AVAILABLE';
  }
});

export default Coral;
