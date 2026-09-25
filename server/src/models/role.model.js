const { DataTypes } = require('sequelize');

/**
 * Reference table of assignable roles (SUPER_ADMIN, UNIVERSITY_ADMIN,
 * FACULTY, RESEARCHER, STUDENT to start). `name` is a plain VARCHAR, not
 * a DB ENUM, so new roles can be added with an INSERT instead of a
 * schema migration — see docs/database-guidelines.md. No seeders are
 * created in this chunk; the initial set is documented in
 * `src/utils/enums.js` (INITIAL_ROLE_NAMES) for a future seed step.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Role',
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
      tableName: 'roles',
      // Reference/lookup data: no soft delete, roles are removed outright
      // by an administrator if ever retired.
      paranoid: false,
    }
  );
