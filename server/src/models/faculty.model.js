const { DataTypes } = require('sequelize');
const { ORG_UNIT_STATUS } = require('../utils/enums');

/**
 * A faculty (school/college) belongs to exactly one university. See
 * department.model.js for why departments don't always need a faculty.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Faculty',
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      shortName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(ORG_UNIT_STATUS)),
        allowNull: false,
        defaultValue: ORG_UNIT_STATUS.ACTIVE,
      },
    },
    {
      tableName: 'faculties',
      paranoid: true,
      indexes: [{ fields: ['university_id'] }],
    }
  );
