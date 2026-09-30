const Joi = require('joi');

// `.empty('')` — see certification.validator.js: a blank date input
// submits '', which should behave like "not provided," not a bad date.
const createAchievementSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(2000).allow('', null),
  organization: Joi.string().trim().max(255).allow('', null),
  achievement_date: Joi.date().iso().empty('').allow(null),
  url: Joi.string().trim().uri().allow('', null),
});

const updateAchievementSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255),
  description: Joi.string().trim().max(2000).allow('', null),
  organization: Joi.string().trim().max(255).allow('', null),
  achievement_date: Joi.date().iso().empty('').allow(null),
  url: Joi.string().trim().uri().allow('', null),
}).min(1);

module.exports = { createAchievementSchema, updateAchievementSchema };
