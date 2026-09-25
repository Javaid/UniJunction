const Joi = require('joi');

const assignUniversityAdminSchema = Joi.object({
  userId: Joi.string().trim().uuid().required(),
});

module.exports = { assignUniversityAdminSchema };
