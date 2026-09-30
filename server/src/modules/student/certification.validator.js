const Joi = require('joi');

// §21/§42: reject an expiry date earlier than the issue date. Both are
// optional independently, but once both are present the relationship
// must be sane.
// `.empty('')` treats an empty string the same as "not provided" (rather
// than a value Joi.date() must parse) — an HTML <input type="date"> that
// was left blank submits '' — so a blank date field behaves like a
// blank text field elsewhere in this codebase, not a validation error.
const createCertificationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  issuing_organization: Joi.string().trim().max(255).allow('', null),
  issue_date: Joi.date().iso().empty('').allow(null),
  expiry_date: Joi.date().iso().empty('').min(Joi.ref('issue_date')).allow(null).messages({
    'date.min': 'Expiry date cannot be earlier than the issue date.',
  }),
  credential_id: Joi.string().trim().max(255).allow('', null),
  credential_url: Joi.string().trim().uri().allow('', null),
  description: Joi.string().trim().max(2000).allow('', null),
});

const updateCertificationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  issuing_organization: Joi.string().trim().max(255).allow('', null),
  issue_date: Joi.date().iso().empty('').allow(null),
  expiry_date: Joi.date().iso().empty('').min(Joi.ref('issue_date')).allow(null).messages({
    'date.min': 'Expiry date cannot be earlier than the issue date.',
  }),
  credential_id: Joi.string().trim().max(255).allow('', null),
  credential_url: Joi.string().trim().uri().allow('', null),
  description: Joi.string().trim().max(2000).allow('', null),
}).min(1);

module.exports = { createCertificationSchema, updateCertificationSchema };
