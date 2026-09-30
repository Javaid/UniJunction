const { DataTypes } = require('sequelize');
const { CATALOG_STATUS } = require('../utils/enums');

/**
 * A normalized academic-interest catalog entry (e.g. "Artificial
 * Intelligence", "Healthcare") — see docs/student-profiles.md,
 * "Academic interests". Same reasoning as `Skill`: a `uuid` for URL
 * addressing, no `deleted_at` (retirement is `status: INACTIVE`).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Interest',
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
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      category: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(CATALOG_STATUS)),
        allowNull: false,
        defaultValue: CATALOG_STATUS.ACTIVE,
      },
    },
    {
      tableName: 'interests',
      indexes: [{ fields: ['category'] }, { fields: ['status'] }],
    }
  );
