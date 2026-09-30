const Joi = require('joi');

const listInterestsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().trim().max(100).allow('', null),
  category: Joi.string().trim().max(30).allow('', null),
});

const addStudentInterestSchema = Joi.object({
  interest_id: Joi.string().trim().uuid().required(),
});

module.exports = { listInterestsQuerySchema, addStudentInterestSchema };
