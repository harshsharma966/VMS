const { DataTypes } = require('sequelize');
const { SUBSCRIPTION_STATUS } = require('../utils/constants');

module.exports = (sequelize) => {
  const Subscription = sequelize.define(
    'Subscription',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      planId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'plans', key: 'id' },
      },
      stripeSubscriptionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      razorpaySubscriptionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(Object.values(SUBSCRIPTION_STATUS)),
        defaultValue: SUBSCRIPTION_STATUS.ACTIVE,
      },
      currentPeriodStart: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      currentPeriodEnd: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'subscriptions',
      underscored: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['status'] },
      ],
    }
  );

  Subscription.associate = (models) => {
    Subscription.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Subscription.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });
    Subscription.hasMany(models.Payment, { foreignKey: 'subscriptionId', as: 'payments' });
  };

  return Subscription;
};
