const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Camera = sequelize.define(
    'Camera',
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
      monitorId: {
        type: DataTypes.STRING(24),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(20),
        defaultValue: 'h264',
      },
      host: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      port: {
        type: DataTypes.INTEGER,
        defaultValue: 554,
      },
      path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      fps: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
      },
      status: {
        type: DataTypes.ENUM('online', 'offline'),
        defaultValue: 'offline',
      },
      // Parent device group (1 IP → many cameras)
      groupId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'camera_groups', key: 'id' },
      },
      // Channel number on the NVR (1=ch101, 2=ch201, 3=ch301...)
      channel: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      fps: {
        type: DataTypes.INTEGER,
        defaultValue: 25,
      },
      // S3 path: recordings/{userId}/{groupName}/{cameraName}/
      s3Path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: 'cameras',
      underscored: true,
      indexes: [
        { unique: true, fields: ['user_id', 'monitor_id'] },
        { fields: ['group_id'] },
      ],
    }
  );

  Camera.associate = (models) => {
    Camera.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Camera.belongsTo(models.CameraGroup, { foreignKey: 'groupId', as: 'group' });
  };

  return Camera;
};
