const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CameraGroup = sequelize.define(
    'CameraGroup',
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
      // Display name: "Office 13", "Office 14", "Warehouse A", etc.
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      // IP address of the NVR/DVR device
      host: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      port: {
        type: DataTypes.INTEGER,
        defaultValue: 554,
      },
      httpPort: {
        type: DataTypes.INTEGER,
        defaultValue: 80,
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      deviceType: {
        type: DataTypes.ENUM('hikvision', 'dahua', 'axis', 'generic'),
        defaultValue: 'hikvision',
      },
      // Total camera channels on this device (e.g. 9 or 10)
      totalChannels: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM('online', 'offline', 'unknown'),
        defaultValue: 'unknown',
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      // S3 folder: recordings/{userId}/{groupName}/
      s3Folder: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: 'camera_groups',
      underscored: true,
      indexes: [
        { fields: ['user_id'] },
        { unique: true, fields: ['user_id', 'host'] },
      ],
    }
  );

  CameraGroup.associate = (models) => {
    CameraGroup.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    CameraGroup.hasMany(models.Camera, { foreignKey: 'groupId', as: 'cameras' });
  };

  return CameraGroup;
};
