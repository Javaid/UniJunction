const { DataTypes } = require('sequelize');

/**
 * Join table: a student's academic interest — see
 * docs/student-profiles.md, "Academic interests". Pure relational fact,
 * same reasoning as `StudentSkill` (no `uuid`, no soft delete).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'StudentInterest',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      studentProfileId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      interestId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
    },
    {
      tableName: 'student_interests',
      indexes: [
        { unique: true, fields: ['student_profile_id', 'interest_id'] },
        { fields: ['interest_id'] },
      ],
    }
  );
