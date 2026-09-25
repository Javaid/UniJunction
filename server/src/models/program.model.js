const { DataTypes } = require('sequelize');
const { ORG_UNIT_STATUS } = require('../utils/enums');

/**
 * A program always belongs to a department (and, transitively, a
 * university and optionally a faculty). `degreeLevel` is a plain
 * VARCHAR rather than an ENUM — the initial vocabulary (CERTIFICATE,
 * DIPLOMA, ASSOCIATE, BACHELOR, MASTER, MS, MPHIL, PHD) is documented in
 * docs/database-guidelines.md, but new degree structures should not
 * require a schema migration.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Program',
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
      facultyId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      departmentId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      shortName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      degreeLevel: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      durationYears: {
        type: DataTypes.DECIMAL(3, 1).UNSIGNED,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(ORG_UNIT_STATUS)),
        allowNull: false,
        defaultValue: ORG_UNIT_STATUS.ACTIVE,
      },
    },
    {
      tableName: 'programs',
      paranoid: true,
      indexes: [
        { fields: ['university_id'] },
        { fields: ['department_id'] },
        { fields: ['degree_level'] },
      ],
    }
  );
