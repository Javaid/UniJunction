const { DataTypes } = require('sequelize');
const { MEMBERSHIP_TYPE, MEMBERSHIP_STATUS } = require('../utils/enums');

/**
 * Represents institutional affiliation: which university a user belongs
 * to, and in what capacity (`membershipType`). This is deliberately
 * SEPARATE from platform `Role` (what a user is allowed to do) — see
 * docs/university-management.md, "Role vs. membership". A
 * `UNIVERSITY_ADMIN` role is global capability; an `ADMIN`-type
 * membership row is what scopes that capability to one specific
 * university (see `modules/university/access.service.js`).
 *
 * A user may hold several memberships (different universities, or even
 * different membership types at the same one — e.g. a STUDENT who is
 * also a part-time STAFF member). `isPrimary` marks at most one as the
 * user's main institutional affiliation, enforced at the service layer
 * (see `membership.service.js`) rather than a DB constraint, since MySQL
 * has no partial/filtered unique index to express "at most one row with
 * is_primary=true per user" directly.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'UniversityMembership',
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
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      universityId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      membershipType: {
        type: DataTypes.ENUM(...Object.values(MEMBERSHIP_TYPE)),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(MEMBERSHIP_STATUS)),
        allowNull: false,
        defaultValue: MEMBERSHIP_STATUS.PENDING,
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      leftAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'university_memberships',
      paranoid: true,
      indexes: [
        { unique: true, fields: ['user_id', 'university_id', 'membership_type'] },
        { fields: ['university_id'] },
        { fields: ['status'] },
      ],
    }
  );
