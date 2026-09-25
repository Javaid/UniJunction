/**
 * Standard application error carrying an HTTP status code.
 *
 * Services and controllers throw this instead of raw Errors so the
 * centralized error handler can respond consistently.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = ApiError;
