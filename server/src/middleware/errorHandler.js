const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

/**
 * Centralized error handler. Every controller/service error funnels
 * through here so API responses stay consistent and internals never
 * leak to clients in production.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isKnownError = err instanceof ApiError;
  const statusCode = isKnownError ? err.statusCode : 500;
  const message = isKnownError || !env.isProduction ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    logger.error(err);
  }

  const body = { success: false, message };
  if (isKnownError && err.details) {
    body.details = err.details;
  }
  if (!env.isProduction && statusCode >= 500) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
