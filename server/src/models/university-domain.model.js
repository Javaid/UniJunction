const { DataTypes } = require('sequelize');
const { ORG_UNIT_STATUS } = require('../utils/enums');

/**
 * A verified email domain associated with a university (e.g.
 * `university.edu`, `students.university.edu`). A university may have
 * several — this is why Chunk 02's single `universities.email_domain`
 * column was insufficient (see docs/university-management.md).
 *
 * Stores the bare domain only — never a full email address. `domain` is
 * globally unique: two universities cannot plausibly own the same DNS
 * domain, so uniqueness is enforced platform-wide, not per-university.
 *
 * Addressed by its own `uuid` externally (`DELETE
 * .../domains/:domainId`), consistent with the project's primary-key
 * strategy for any row referenced by ID from a URL — see
 * docs/database-guidelines.md §4.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'UniversityDomain',
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
      universityId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      domain: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(ORG_UNIT_STATUS)),
        allowNull: false,
        defaultValue: ORG_UNIT_STATUS.ACTIVE,
      },
    },
    {
      tableName: 'university_domains',
      paranoid: true,
      indexes: [{ fields: ['university_id'] }],
    }
  );
