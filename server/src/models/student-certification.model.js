const { DataTypes } = require('sequelize');

/**
 * A certification a student holds — see docs/student-profiles.md,
 * "Certifications". Unlike the join tables above, this (and
 * `StudentAchievement`/`StudentGoal`) is a standalone record addressed
 * by its own id from a URL (`/api/students/me/certifications/:id`), so
 * it carries a `uuid` and is `paranoid` (soft-deleted), consistent with
 * every other externally-addressable entity in this codebase — see
 * database-guidelines.md §4/§6. External credential verification is
 * explicitly out of scope for this chunk (see docs/student-profiles.md).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'StudentCertification',
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
      studentProfileId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      issuingOrganization: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      issueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      credentialId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      credentialUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'student_certifications',
      paranoid: true,
      indexes: [{ fields: ['student_profile_id'] }],
    }
  );
