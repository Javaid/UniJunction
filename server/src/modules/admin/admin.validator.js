const Joi = require('joi');

const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().trim().uppercase().optional(),
});

const assignRoleSchema = Joi.object({
  role: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z][A-Z0-9_]*$/)
    .required(),
});

module.exports = { listUsersQuerySchema, assignRoleSchema };
