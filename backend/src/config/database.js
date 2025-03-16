import { Sequelize } from 'sequelize';
import env from './env.js';

// For Sequelize CLI
const config = {
  development: {
    username: env.database.user,
    password: env.database.password,
    database: env.database.name,
    host: env.database.host,
    port: env.database.port,
    dialect: 'mysql',
    logging: env.isDevelopment ? console.log : false,
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000
    },
    retry: {
      match: [/Deadlock/i, /Lock wait timeout/i],
      max: 3,
      backoffBase: 1000
    }
  },
  production: {
    username: env.database.user,
    password: env.database.password,
    database: env.database.name,
    host: env.database.host,
    port: env.database.port,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000
    },
    retry: {
      match: [/Deadlock/i, /Lock wait timeout/i],
      max: 3,
      backoffBase: 1000
    }
  }
};

// For application use
const sequelize = new Sequelize(
  env.database.name,
  env.database.user,
  env.database.password,
  config[env.isDevelopment ? 'development' : 'production']
);

export { Op } from 'sequelize';
export { config as default };
export { sequelize };
