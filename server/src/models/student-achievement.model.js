const { DataTypes } = require('sequelize');

/**
 * An achievement a student wants to showcase (hackathon win, academic
 * award, scholarship, ...) — see docs/student-profiles.md,
 * "Achievements". Same addressability reasoning as
 * `StudentCertification`: has a `uuid`, is `paranoid`.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'StudentAchievement',
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
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      organization: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      achievementDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: 'student_achievements',
      paranoid: true,
      indexes: [{ fields: ['student_profile_id'] }],
    }
  );
