const Joi = require('joi');
const { MEMBERSHIP_TYPE, MEMBERSHIP_STATUS } = require('../../utils/enums');

const membershipType = Joi.string()
  .trim()
  .uppercase()
  .valid(...Object.values(MEMBERSHIP_TYPE));
const membershipStatus = Joi.string()
  .trim()
  .uppercase()
  .valid(...Object.values(MEMBERSHIP_STATUS));

const createMembershipSchema = Joi.object({
  user_id: Joi.string().trim().uuid().required(),
  membership_type: membershipType.required(),
  status: membershipStatus.default(MEMBERSHIP_STATUS.PENDING),
  is_primary: Joi.boolean().default(false),
});

const updateMembershipSchema = Joi.object({
  status: membershipStatus,
  is_primary: Joi.boolean(),
}).min(1);

const listMembershipsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  status: membershipStatus,
  membership_type: membershipType,
});

module.exports = { createMembershipSchema, updateMembershipSchema, listMembershipsQuerySchema };
