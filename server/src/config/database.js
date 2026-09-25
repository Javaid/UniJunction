/**
 * Sequelize connection foundation (MySQL 8, via mysql2).
 *
 * Schema is NOT managed by Sequelize sync in any environment — see
 * /database/schema.sql for the deliberately-controlled DDL and
 * /docs/database-guidelines.md for the reasoning. This file only
 * configures the connection (pooling, timezone, timeouts) so models
 * have a shared instance to attach to.
 */
const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  dialectOptions: {
    connectTimeout: 10000,
    ...(env.db.encrypt ? { ssl: { require: true, rejectUnauthorized: true } } : {}),
  },
  pool: env.db.pool,
  // Store and read all timestamps as UTC regardless of server/client locale.
  timezone: '+00:00',
  logging: env.isProduction ? false : (sql) => logger.debug(sql),
  define: {
    underscored: true,
  },
});

const connectDatabase = async () => {
  await sequelize.authenticate();
  logger.info(`Database connection established (${env.db.host}:${env.db.port}/${env.db.name})`);
};

/**
 * Lightweight liveness check for the /api/health endpoint. Never throws
 * connection details to the caller — resolves to a boolean only.
 */
const isDatabaseHealthy = async () => {
  try {
    await sequelize.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error.message);
    return false;
  }
};

module.exports = { sequelize, connectDatabase, isDatabaseHealthy };
