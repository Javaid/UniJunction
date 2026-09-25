const { DataTypes } = require('sequelize');

/**
 * Join table for the many-to-many Role ↔ Permission relationship. Pure
 * relational data, like UserRole: hard-deleted, cascades with its parent
 * role or permission.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'RolePermission',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      roleId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      permissionId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
    },
    {
      tableName: 'role_permissions',
      paranoid: false,
      indexes: [{ unique: true, fields: ['role_id', 'permission_id'] }],
    }
  );
