const Joi = require('joi');
const { PROFILE_VISIBILITY, AVAILABILITY_STATUS, ACADEMIC_STATUS } = require('../../utils/enums');

// §11/§12/§42/§43: headline/bio must never carry HTML — a simple
// "no angle brackets" pattern is enough to reject markup without
// building a rich-text sanitizer this chunk doesn't otherwise need.
const NO_HTML_PATTERN = /^[^<>]*$/;
const noHtmlText = (max) =>
  Joi.string()
    .trim()
    .max(max)
    .pattern(NO_HTML_PATTERN)
    .allow('', null)
    .messages({ 'string.pattern.base': 'HTML is not allowed in this field.' });

// §8: the database column allows a generous 0-255 range (TINYINT
// UNSIGNED); this is the real, application-level ceiling. 20 comfortably
// covers extended-duration and part-time programs without being
// meaningless — see docs/student-profiles.md, "Current semester".
const currentSemester = Joi.number().integer().min(1).max(20);

// Sanity bounds only — not a hard business rule, just enough to catch
// obvious data-entry mistakes (e.g. a 4-digit typo).
const academicYear = Joi.number().integer().min(1900).max(2100);

const createProfileSchema = Joi.object({
  university_id: Joi.string().trim().uuid().required(),
  program_id: Joi.string().trim().uuid().allow(null),
  student_identifier: noHtmlText(50),
  admission_year: academicYear.allow(null),
  expected_graduation_year: academicYear.allow(null),
  current_semester: currentSemester.allow(null),
  bio: noHtmlText(2000),
  headline: noHtmlText(150),
  profile_visibility: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(PROFILE_VISIBILITY)),
  availability_status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(AVAILABILITY_STATUS)),
});

// §40: deliberately excludes university_id, student_identifier, and
// academic_status — none of these are reassignable through the ordinary
// profile update. academic_status has its own PATCH .../status endpoint;
// university_id and student_identifier require an institutional workflow
// this chunk does not build.
const updateProfileSchema = Joi.object({
  program_id: Joi.string().trim().uuid().allow(null),
  admission_year: academicYear.allow(null),
  expected_graduation_year: academicYear.allow(null),
  current_semester: currentSemester.allow(null),
  bio: noHtmlText(2000),
  headline: noHtmlText(150),
  profile_visibility: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(PROFILE_VISIBILITY)),
  availability_status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(AVAILABILITY_STATUS)),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(ACADEMIC_STATUS))
    .required(),
});

module.exports = { createProfileSchema, updateProfileSchema, updateStatusSchema };
