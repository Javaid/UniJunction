const Joi = require('joi');
const { GOAL_TYPE, GOAL_STATUS } = require('../../utils/enums');

const createGoalSchema = Joi.object({
  goal_type: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(GOAL_TYPE))
    .required(),
  title: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(2000).allow('', null),
  // `.empty('')` — see certification.validator.js: a blank date input
  // submits '', which should behave like "not provided," not a bad date.
  target_date: Joi.date().iso().empty('').allow(null),
  status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(GOAL_STATUS))
    .default(GOAL_STATUS.ACTIVE),
});

const updateGoalSchema = Joi.object({
  goal_type: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(GOAL_TYPE)),
  title: Joi.string().trim().min(1).max(255),
  description: Joi.string().trim().max(2000).allow('', null),
  target_date: Joi.date().iso().empty('').allow(null),
  status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(GOAL_STATUS)),
}).min(1);

module.exports = { createGoalSchema, updateGoalSchema };
