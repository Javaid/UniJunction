const { DataTypes } = require('sequelize');
const { CATALOG_STATUS } = require('../utils/enums');

/**
 * A node in the hierarchical research-area catalog (e.g. Artificial
 * Intelligence > Machine Learning > Deep Learning) — see
 * docs/student-profiles.md, "Research areas". `parentId` is a
 * self-referential FK (see models/index.js for the `parent`/`children`
 * associations); `SET NULL` on the parent's removal mirrors the
 * Faculty -> Department precedent (an optional parent reference clears
 * rather than blocks or cascades).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'ResearchArea',
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
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(170),
        allowNull: false,
        unique: true,
      },
      parentId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(CATALOG_STATUS)),
        allowNull: false,
        defaultValue: CATALOG_STATUS.ACTIVE,
      },
    },
    {
      tableName: 'research_areas',
      indexes: [{ fields: ['parent_id'] }, { fields: ['status'] }],
    }
  );
