import env from './env.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Coral from '../models/Coral.js';
import { sequelize } from './database.js';
import { fileURLToPath } from 'url';

const categories = [
  {
    name: 'SPS Corals',
    description: 'Small Polyp Stony Corals - Fast growing, calcium-dependent corals'
  },
  {
    name: 'LPS Corals',
    description: 'Large Polyp Stony Corals - Slower growing corals with large, fleshy polyps'
  },
  {
    name: 'Soft Corals',
    description: 'Corals without calcium carbonate skeletons - Generally easier to keep'
  },
  {
    name: 'Zoanthids',
    description: 'Colonial polyps that often form colorful mats'
  },
  {
    name: 'Mushroom Corals',
    description: 'Disc-shaped corals known for their unique patterns and colors'
  }
];

const sampleCorals = [
  {
    speciesName: 'Bird\'s Nest Coral',
    scientificName: 'Seriatopora hystrix',
    description: 'A delicate SPS coral with thin branches and small polyps',
    careLevel: 'MODERATE',
    growthRate: 'FAST',
    lightingRequirements: 'High intensity LED or T5',
    waterFlow: 'HIGH',
    temperature: { min: 75, max: 82 },
    pH: { min: 8.1, max: 8.4 },
    salinity: { min: 1.023, max: 1.025 },
    quantity: 10,
    price: 49.99,
    minimumStock: 3,
    status: 'AVAILABLE',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Seriatopora_hystrix_%28Thin_branch_bird%27s_nest_coral%29.jpg'
  },
  {
    speciesName: 'Torch Coral',
    scientificName: 'Euphyllia glabrescens',
    description: 'Popular LPS coral known for its sweeping tentacles',
    careLevel: 'EASY',
    growthRate: 'MODERATE',
    lightingRequirements: 'Medium intensity LED',
    waterFlow: 'MEDIUM',
    temperature: { min: 76, max: 82 },
    pH: { min: 8.1, max: 8.4 },
    salinity: { min: 1.023, max: 1.025 },
    quantity: 15,
    price: 89.99,
    minimumStock: 5,
    status: 'AVAILABLE',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Euphyllia_glabrescens_%28Torch_coral%29.jpg'
  }
];

async function seedDatabase() {
  try {
    // Sync database without altering existing tables
    await sequelize.sync({ force: false });
    console.log('Database synced (without altering tables)');

    // Create admin user
    const adminExists = await User.findOne({ where: { email: env.admin.email } });
    if (!adminExists) {
      await User.create({
        email: env.admin.email,
        password: env.admin.password,
        name: env.admin.name,
        role: 'ADMIN',
        status: 'ACTIVE'
      });
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }

    // Create categories
    for (const category of categories) {
      const [cat, created] = await Category.findOrCreate({
        where: { name: category.name },
        defaults: {
          ...category,
          status: 'ACTIVE'
        }
      });
      if (created) {
        console.log(`Category created: ${category.name}`);
      } else {
        console.log(`Category already exists: ${category.name}`);
      }
    }

    // Create sample corals if none exist
    const coralsExist = await Coral.count();
    if (coralsExist === 0) {
      const categories = await Category.findAll();
      
      // Helper function to find category by name
      const findCategoryByName = (name) => categories.find(cat => cat.name === name);
      
      for (const coral of sampleCorals) {
        // Determine correct category based on coral type
        let category;
        if (coral.description.toLowerCase().includes('sps coral')) {
          category = findCategoryByName('SPS Corals');
        } else if (coral.description.toLowerCase().includes('lps coral')) {
          category = findCategoryByName('LPS Corals');
        } else if (coral.description.toLowerCase().includes('soft coral')) {
          category = findCategoryByName('Soft Corals');
        } else if (coral.description.toLowerCase().includes('zoanthid')) {
          category = findCategoryByName('Zoanthids');
        } else if (coral.description.toLowerCase().includes('mushroom')) {
          category = findCategoryByName('Mushroom Corals');
        }
        
        if (!category) {
          console.warn(`No matching category found for coral: ${coral.speciesName}`);
          continue;
        }
        
        await Coral.create({
          ...coral,
          categoryId: category.id,
          createdBy: (await User.findOne({ where: { role: 'ADMIN' } })).id
        });
      }
      console.log('Sample corals created');
    } else {
      console.log('Corals already exist, skipping sample data');
    }

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeder if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase().then(() => process.exit(0));
}

export default seedDatabase;
