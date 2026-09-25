const { DataTypes } = require('sequelize');

/**
 * Reference table of grantable permissions (USER_VIEW, ROLE_ASSIGN, ...).
 * Each permission represents a single action, mapped to roles through
 * RolePermission. `name` is VARCHAR, not ENUM, for the same extensibility
 * reason as roles.name — see docs/database-guidelines.md.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Permission',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: 'permissions',
      // Reference/lookup data: no soft delete, same as roles.
      paranoid: false,
    }
  );
