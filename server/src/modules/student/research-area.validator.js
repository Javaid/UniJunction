const Joi = require('joi');
const { RESEARCH_INTEREST_LEVEL } = require('../../utils/enums');

// §30: "support hierarchical research-area discovery" — `parent_id`
// filters to the direct children of a node; omitted returns the whole
// (small, curated) catalog flat, with each row's own `parent_id` letting
// the client reconstruct the tree without a second round-trip.
const listResearchAreasQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow('', null),
  parent_id: Joi.string().trim().uuid().allow('', null),
});

const addStudentResearchInterestSchema = Joi.object({
  research_area_id: Joi.string().trim().uuid().required(),
  interest_level: Joi.string()
    .trim()
    .uppercase()
    .valid(...Object.values(RESEARCH_INTEREST_LEVEL))
    .default(RESEARCH_INTEREST_LEVEL.CURIOUS),
});

module.exports = { listResearchAreasQuerySchema, addStudentResearchInterestSchema };
