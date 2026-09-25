/**
 * Sequelize connection foundation.
 *
 * No models, migrations, or seeders are registered in this chunk — the
 * schema will be defined deliberately in a later chunk. This file only
 * establishes the connection so future domains have a shared instance
 * to attach models to.
 */
const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  dialectOptions: env.db.encrypt
    ? { ssl: { require: true, rejectUnauthorized: true } }
    : {},
  logging: env.isProduction ? false : (sql) => logger.debug(sql),
  define: {
    underscored: true,
  },
});

const connectDatabase = async () => {
  await sequelize.authenticate();
  logger.info(`Database connection established (${env.db.host}:${env.db.port}/${env.db.name})`);
};

module.exports = { sequelize, connectDatabase };
