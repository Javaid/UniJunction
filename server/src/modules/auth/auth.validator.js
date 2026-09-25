const Joi = require('joi');

// At least one letter and one digit; length does the rest of the work.
// Deliberately not more complex than this — see docs/authentication.md,
// "Password policy".
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const email = Joi.string().trim().lowercase().email().max(255).required();

const password = Joi.string()
  .min(8)
  .max(72) // bcrypt ignores bytes beyond 72; reject rather than silently truncate
  .pattern(PASSWORD_PATTERN)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least one letter and one number.',
    'string.min': 'Password must be at least 8 characters long.',
  });

const registerSchema = Joi.object({
  email,
  password,
  first_name: Joi.string().trim().min(1).max(100).required(),
  last_name: Joi.string().trim().min(1).max(100).required(),
});

const loginSchema = Joi.object({
  email,
  password: Joi.string().required(), // login only needs "required", not the strength policy
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().required(),
});

const resendVerificationSchema = Joi.object({
  email,
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().trim().required(),
});

const logoutSchema = Joi.object({
  refresh_token: Joi.string().trim().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  refreshSchema,
  logoutSchema,
};
