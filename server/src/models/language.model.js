const { DataTypes } = require('sequelize');
const { CATALOG_STATUS } = require('../utils/enums');

/**
 * A normalized language catalog entry — see docs/student-profiles.md,
 * "Languages". `code` is the standard ISO 639-1 two-letter code (e.g.
 * "en", "fr") where one exists; it is stored for display/interop, but
 * (per database-guidelines.md §4) the `uuid` — not `code` — is what the
 * API addresses a language by from a URL, keeping every catalog table in
 * this chunk consistent about how it's externally referenced.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Language',
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
      code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(CATALOG_STATUS)),
        allowNull: false,
        defaultValue: CATALOG_STATUS.ACTIVE,
      },
    },
    {
      tableName: 'languages',
      indexes: [{ fields: ['status'] }],
    }
  );
