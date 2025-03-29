import env from './env.js';
import User from '../models/User.js';
import { sequelize } from './database.js';
import { fileURLToPath } from 'url';

async function seedDatabase() {
  try {
    // Sync database without altering existing tables
    await sequelize.sync({ force: false });
    console.log('Database synced (without altering tables)');

    // Create admin user only
    const adminExists = await User.findOne({ where: { email: env.admin.email } });
    if (!adminExists) {
      await User.create({
        email: env.admin.email,
        password: env.admin.password,
        name: env.admin.name,
        role: 'SUPERADMIN',
        status: 'ACTIVE'
      });
      console.log('Superadmin user created');
    } else {
      console.log('Admin user already exists');
    }

    console.log('Database seeding completed successfully (admin user only)');
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
