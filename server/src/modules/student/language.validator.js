const Joi = require('joi');
const { LANGUAGE_PROFICIENCY } = require('../../utils/enums');

const listLanguagesQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow('', null),
});

const addStudentLanguageSchema = Joi.object({
  language_id: Joi.string().trim().uuid().required(),
  proficiency_level: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(LANGUAGE_PROFICIENCY))
    .default(LANGUAGE_PROFICIENCY.CONVERSATIONAL),
});

const updateStudentLanguageSchema = Joi.object({
  proficiency_level: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(LANGUAGE_PROFICIENCY))
    .required(),
});

module.exports = { listLanguagesQuerySchema, addStudentLanguageSchema, updateStudentLanguageSchema };
