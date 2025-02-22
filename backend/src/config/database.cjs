require('dotenv').config();

module.exports = {
  development: {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: 'coral_management',  // Adding default database name
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: true,
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000
    }
  },
  production: {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: 'coral_management',  // Adding default database name
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000
    }
  }
};
