import Category from './Category.js';
import Coral from './Coral.js';
import User from './User.js';
import { Order } from './Order.js';
import Client from './Client.js';

// Define associations
Coral.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

Coral.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

Category.hasMany(Coral, {
  foreignKey: 'categoryId',
  onDelete: 'RESTRICT',
  hooks: true
});

// Client-Order association
Client.hasMany(Order, {
  foreignKey: 'clientId',
  as: 'orders'
});

Order.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client'
});

export { Category, Coral, User, Order, Client };
