const Joi = require('joi');
const { UNIVERSITY_STATUS, VERIFICATION_STATUS } = require('../../utils/enums');

// Whitelisted sort columns (chunk brief §9: "do not allow arbitrary SQL
// sorting fields") — never interpolate a client-supplied column name
// directly into a query.
const SORTABLE_FIELDS = ['name', 'city', 'country', 'status', 'createdAt'];

const optionalText = (max) => Joi.string().trim().max(max).allow('', null);

const createUniversitySchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  short_name: optionalText(100),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .min(1)
    .max(150)
    .required()
    .messages({ 'string.pattern.base': 'Slug must be lowercase letters, numbers, and hyphens only.' }),
  description: optionalText(5000),
  website_url: Joi.string().trim().uri().allow('', null),
  logo_url: Joi.string().trim().uri().allow('', null),
  email_domain: Joi.string().trim().lowercase().allow('', null),
  country: optionalText(100),
  state_province: optionalText(100),
  city: optionalText(100),
  address: optionalText(500),
  postal_code: optionalText(20),
});

// Deliberately excludes `slug` (stable identifier once created), `status`
// (own endpoint — §7/§12), and `verification_status`/`verified_at` (own
// endpoint — §14). Anything not listed here is stripped by the shared
// `validate` middleware's `stripUnknown`.
const updateUniversitySchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  short_name: optionalText(100),
  description: optionalText(5000),
  website_url: Joi.string().trim().uri().allow('', null),
  logo_url: Joi.string().trim().uri().allow('', null),
  email_domain: Joi.string().trim().lowercase().allow('', null),
  country: optionalText(100),
  state_province: optionalText(100),
  city: optionalText(100),
  address: optionalText(500),
  postal_code: optionalText(20),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(UNIVERSITY_STATUS))
    .required(),
});

const updateVerificationSchema = Joi.object({
  status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(VERIFICATION_STATUS))
    .required(),
});

const listUniversitiesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(255).allow('', null),
  status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(UNIVERSITY_STATUS)),
  verification_status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(VERIFICATION_STATUS)),
  country: Joi.string().trim().max(100),
  city: Joi.string().trim().max(100),
  sortBy: Joi.string()
    .valid(...SORTABLE_FIELDS)
    .default('name'),
  sortDir: Joi.string().valid('asc', 'desc').default('asc'),
});

module.exports = {
  SORTABLE_FIELDS,
  createUniversitySchema,
  updateUniversitySchema,
  updateStatusSchema,
  updateVerificationSchema,
  listUniversitiesQuerySchema,
};
