const Joi = require('joi');

// Bare hostname only — no scheme, path, or "@" (which would make it an
// email address, explicitly disallowed — chunk brief §15).
const DOMAIN_PATTERN = /^(?=.{1,255}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

const createDomainSchema = Joi.object({
  domain: Joi.string()
    .trim()
    .lowercase()
    .pattern(DOMAIN_PATTERN)
    .required()
    .messages({
      'string.pattern.base': 'Must be a bare domain (e.g. university.edu), not a URL or email address.',
    }),
  is_primary: Joi.boolean().default(false),
});

module.exports = { createDomainSchema };
