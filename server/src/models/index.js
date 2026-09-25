/**
 * Sequelize model registry.
 *
 * No models exist yet — the database schema will be defined
 * deliberately in a later chunk. Future models register here, e.g.:
 *
 *   const User = require('./user.model')(sequelize);
 *   module.exports = { sequelize, User };
 */
const { sequelize } = require('../config/database');

module.exports = { sequelize };
