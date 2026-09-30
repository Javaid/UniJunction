const { DataTypes } = require('sequelize');
const { GOAL_TYPE, GOAL_STATUS } = require('../utils/enums');

/**
 * An academic/career goal a student is tracking — see
 * docs/student-profiles.md, "Academic goals". Same addressability
 * reasoning as `StudentCertification`: has a `uuid`, is `paranoid`.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'StudentGoal',
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
      goalType: {
        type: DataTypes.ENUM(...Object.values(GOAL_TYPE)),
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
      targetDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(GOAL_STATUS)),
        allowNull: false,
        defaultValue: GOAL_STATUS.ACTIVE,
      },
    },
    {
      tableName: 'student_goals',
      paranoid: true,
      indexes: [{ fields: ['student_profile_id'] }, { fields: ['status'] }],
    }
  );
