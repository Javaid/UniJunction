const { DataTypes } = require('sequelize');

/**
 * Join table for the many-to-many User ↔ Role relationship. A user may
 * hold several roles at once (e.g. FACULTY and UNIVERSITY_ADMIN).
 *
 * Pure relational data, not an institutional entity in its own right, so
 * it is hard-deleted (no `deleted_at`) and cascades when its parent user
 * or role is removed — see docs/database-guidelines.md for the
 * ON DELETE policy.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'UserRole',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      roleId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
    },
    {
      tableName: 'user_roles',
      paranoid: false,
      indexes: [{ unique: true, fields: ['user_id', 'role_id'] }],
    }
  );
