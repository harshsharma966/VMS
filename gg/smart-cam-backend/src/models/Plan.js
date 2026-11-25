const { DataTypes } = require('sequelize');
const { BILLING_CYCLE } = require('../utils/constants');

module.exports = (sequelize) => {
  const Plan = sequelize.define(
    'Plan',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      maxCameras: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      maxStorage: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Max storage in bytes',
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      billingCycle: {
        type: DataTypes.ENUM(Object.values(BILLING_CYCLE)),
        allowNull: false,
      },
      stripeProductId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      stripePriceId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      razorpayPlanId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'plans',
      underscored: true,
    }
  );

  Plan.associate = (models) => {
    Plan.hasMany(models.Subscription, { foreignKey: 'planId', as: 'subscriptions' });
  };

  return Plan;
};
