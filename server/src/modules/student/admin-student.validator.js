const Joi = require('joi');
const { ACADEMIC_STATUS } = require('../../utils/enums');

const listUniversityStudentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(255).allow('', null),
  program_id: Joi.string().trim().uuid(),
  academic_status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(ACADEMIC_STATUS)),
});

module.exports = { listUniversityStudentsQuerySchema };
