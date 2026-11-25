const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');
const logger = require('../config/logger');

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging || false,
  pool: config.pool,
  define: config.define,
  dialectOptions: config.dialectOptions,
});

// Import models
const User = require('./User')(sequelize);
const Plan = require('./Plan')(sequelize);
const Subscription = require('./Subscription')(sequelize);
const Payment = require('./Payment')(sequelize);
const CameraGroup = require('./CameraGroup')(sequelize);
const Camera = require('./Camera')(sequelize);
const RefreshToken = require('./RefreshToken')(sequelize);
const PasswordReset = require('./PasswordReset')(sequelize);

const models = { User, Plan, Subscription, Payment, CameraGroup, Camera, RefreshToken, PasswordReset };

// Set up associations
Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  Sequelize,
  ...models,
};
