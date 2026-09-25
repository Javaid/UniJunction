const ApiError = require('../utils/ApiError');

/**
 * Generic Joi request validator, reusable by every module. Validates
 * `req[property]` (body by default), replaces it with the sanitized/
 * converted value (e.g. lower-cased email), and rejects unknown fields.
 */
const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return next(new ApiError(422, 'Validation failed.', details));
  }

  req[property] = value;
  next();
};

module.exports = validate;
