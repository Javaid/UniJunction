const { DataTypes } = require('sequelize');
const { UNIVERSITY_STATUS, VERIFICATION_STATUS } = require('../utils/enums');

/**
 * The organizational root of the institution hierarchy
 * (University → Faculty → Department → Program) and the boundary used
 * for multi-tenant scoping — see docs/database-guidelines.md for why
 * that boundary is logical (a shared database + `university_id` FKs),
 * not physical (per-tenant databases), since users must be discoverable
 * across universities.
 *
 * `email_domain` holds a single convenience domain kept for backward
 * compatibility with Chunk 02; multi-domain support is now the dedicated
 * `university_domains` table (Chunk 04) — see
 * docs/university-management.md.
 *
 * `status` (operational: PENDING/ACTIVE/SUSPENDED/DEACTIVATED) and
 * `verificationStatus` (institutional: UNVERIFIED/PENDING/VERIFIED/
 * REJECTED) are deliberately independent dimensions — see
 * docs/university-management.md, "University lifecycle".
 */
module.exports = (sequelize) =>
  sequelize.define(
    'University',
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
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      shortName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      logoUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      websiteUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      emailDomain: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      stateProvince: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      postalCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(UNIVERSITY_STATUS)),
        allowNull: false,
        defaultValue: UNIVERSITY_STATUS.PENDING,
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      verificationStatus: {
        type: DataTypes.ENUM(...Object.values(VERIFICATION_STATUS)),
        allowNull: false,
        defaultValue: VERIFICATION_STATUS.UNVERIFIED,
      },
    },
    {
      tableName: 'universities',
      paranoid: true,
      indexes: [
        { fields: ['status'] },
        { fields: ['country'] },
        { fields: ['city'] },
        { fields: ['verification_status'] },
      ],
    }
  );
