const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../utils/constants');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(Object.values(ROLES)),
        defaultValue: ROLES.USER,
      },
      groupKey: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      apiKey: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'users',
      paranoid: true, // soft deletes
      underscored: true,
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
        },
      },
    }
  );

  User.prototype.validatePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  };

  User.prototype.toSafeJSON = function () {
    const { password, ...user } = this.toJSON();
    return user;
  };

  User.associate = (models) => {
    User.hasMany(models.Subscription, { foreignKey: 'userId', as: 'subscriptions' });
    User.hasMany(models.Payment, { foreignKey: 'userId', as: 'payments' });
    User.hasMany(models.Camera, { foreignKey: 'userId', as: 'cameras' });
    User.hasMany(models.RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
  };

  return User;
};
