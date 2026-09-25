const Joi = require('joi');
const { ORG_UNIT_STATUS, DEGREE_LEVELS } = require('../../utils/enums');

const optionalText = (max) => Joi.string().trim().max(max).allow('', null);
const statusValue = Joi.string()
  .trim()
  .uppercase()
  .valid(...Object.values(ORG_UNIT_STATUS));

const listQuerySchema = (extra = {}) =>
  Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().max(255).allow('', null),
    status: statusValue,
    ...extra,
  });

// ---- Faculty ----------------------------------------------------------------
const createFacultySchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  short_name: optionalText(100),
  description: optionalText(5000),
});

// university_id is deliberately not accepted here — see §18, "do not
// allow university reassignment through ordinary update."
const updateFacultySchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  short_name: optionalText(100),
  description: optionalText(5000),
}).min(1);

const updateStatusSchema = Joi.object({ status: statusValue.required() });

const listFacultiesQuerySchema = listQuerySchema();

// ---- Department ---------------------------------------------------------------
const createDepartmentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  short_name: optionalText(100),
  description: optionalText(5000),
  faculty_id: Joi.string().trim().uuid().allow(null),
});

// university_id is never accepted on update, same reasoning as faculty.
// faculty_id MAY be changed (a department can move between faculties, or
// gain/lose one) but the new value is still verified to belong to the
// same university at the service layer (access.service.js) — see §20.
const updateDepartmentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  short_name: optionalText(100),
  description: optionalText(5000),
  faculty_id: Joi.string().trim().uuid().allow(null),
}).min(1);

const listDepartmentsQuerySchema = listQuerySchema({
  faculty_id: Joi.string().trim().uuid(),
});

// ---- Program ------------------------------------------------------------------
const createProgramSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  short_name: optionalText(100),
  description: optionalText(5000),
  degree_level: Joi.string()
    .trim()
    .uppercase()
    .valid(...DEGREE_LEVELS)
    .required(),
  duration_years: Joi.number().positive().max(20).allow(null),
  department_id: Joi.string().trim().uuid().required(),
  faculty_id: Joi.string().trim().uuid().allow(null),
});

// department_id/faculty_id are not reassignable through ordinary update —
// same "no arbitrary structural reassignment" principle as faculty's
// university_id (§18/§21). A dedicated workflow would be needed to move
// a program between departments.
const updateProgramSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  short_name: optionalText(100),
  description: optionalText(5000),
  degree_level: Joi.string()
    .trim()
    .uppercase()
    .valid(...DEGREE_LEVELS),
  duration_years: Joi.number().positive().max(20).allow(null),
}).min(1);

const listProgramsQuerySchema = listQuerySchema({
  department_id: Joi.string().trim().uuid(),
  degree_level: Joi.string()
    .trim()
    .uppercase()
    .valid(...DEGREE_LEVELS),
});

module.exports = {
  createFacultySchema,
  updateFacultySchema,
  updateStatusSchema,
  listFacultiesQuerySchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  listDepartmentsQuerySchema,
  createProgramSchema,
  updateProgramSchema,
  listProgramsQuerySchema,
};
