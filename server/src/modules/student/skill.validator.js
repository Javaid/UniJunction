const Joi = require('joi');
const { SKILL_PROFICIENCY, SKILL_CATEGORIES } = require('../../utils/enums');

const listSkillsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().trim().max(100).allow('', null),
  category: Joi.string()
    .trim()
    .uppercase()
    .valid(...SKILL_CATEGORIES),
});

const addStudentSkillSchema = Joi.object({
  skill_id: Joi.string().trim().uuid().required(),
  proficiency_level: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(SKILL_PROFICIENCY))
    .default(SKILL_PROFICIENCY.BEGINNER),
  years_experience: Joi.number().min(0).max(60).allow(null),
});

const updateStudentSkillSchema = Joi.object({
  proficiency_level: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(SKILL_PROFICIENCY)),
  years_experience: Joi.number().min(0).max(60).allow(null),
}).min(1);

module.exports = { listSkillsQuerySchema, addStudentSkillSchema, updateStudentSkillSchema };
