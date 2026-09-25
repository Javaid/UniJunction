const { DataTypes } = require('sequelize');
const { USER_STATUS } = require('../utils/enums');

/**
 * Identity record for every person on the platform, independent of the
 * academic role(s) they hold (see Role / UserRole) or the profile detail
 * (student/faculty/researcher) that later chunks attach to it.
 *
 * `passwordHash` is excluded from the default scope so it can never leak
 * through an accidental `res.json(user)`. Code that genuinely needs it
 * (the future auth module) must opt in explicitly with `User.unscoped()`.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      displayName: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      avatarUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(USER_STATUS)),
        allowNull: false,
        defaultValue: USER_STATUS.PENDING,
      },
      emailVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'users',
      paranoid: true,
      defaultScope: {
        attributes: { exclude: ['passwordHash'] },
      },
      indexes: [{ fields: ['status'] }],
    }
  );
