const { DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const PasswordReset = sequelize.define(
    'PasswordReset',
    {
      id: {
        type: DataTypes.CHAR(36),
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      token: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      tableName: 'password_resets',
      underscored: true,
      indexes: [
        { fields: ['token'] },
        { fields: ['user_id'] },
      ],
    }
  );

  PasswordReset.associate = (models) => {
    PasswordReset.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  PasswordReset.generateToken = () => {
    return crypto.randomBytes(48).toString('hex');
  };

  return PasswordReset;
};
